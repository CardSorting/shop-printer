import type { IInventoryLevelRepository, IProductRepository } from '@domain/repositories';
import type { InventoryLineItem } from '@domain/inventory';
import { InsufficientStockError } from '@domain/errors';
import { logger } from '@utils/logger';
import type {
  AdjustInventoryInput,
  AdjustmentResult,
  ApplyDeltasResult,
  ApplyInventoryDeltasInput,
  AvailabilityResult,
  CheckAvailabilityInput,
  CleanupExpiredReservationsInput,
  CleanupReservationsReport,
  ConfirmReservationInput,
  ConfirmReservationResult,
  InventoryApplicationService,
  GetProductLedgerInput,
  GetProductLedgerResult,
  ReconcileInventoryInput,
  ReconciliationResult,
  ReleaseReservationInput,
  ReleaseReservationResult,
  ReceiveStockAtLocationInput,
  ReceiveStockAtLocationResult,
  ReserveInventoryInput,
  ReservationResult,
} from './inventoryApplicationService';
import type { InventoryMutationService } from './InventoryMutationService';
import type { InventoryReservationService } from './InventoryReservationService';
import type { InventoryLedgerService } from './InventoryLedgerService';
import { inventoryErr, inventoryOk, inventoryTry, type InventoryResult } from './inventoryResult';

import type { InventoryReleaseReason } from './inventoryApplicationService';

const DEFAULT_RESERVATION_TTL_MS = 15 * 60 * 1000;

export type InventoryFlowServiceOptions = {
  reservationTtlMs?: number;
  onReservationReleased?: (input: { orderId: string; reason?: InventoryReleaseReason }) => Promise<void>;
  inventoryLevelRepo?: IInventoryLevelRepository;
};

/**
 * Inventory orchestration. Implements InventoryApplicationService for routes and domain callers.
 */
export class InventoryFlowService implements InventoryApplicationService {
  private readonly reservationTtlMs: number;
  private readonly onReservationReleased?: InventoryFlowServiceOptions['onReservationReleased'];
  private readonly inventoryLevelRepo?: IInventoryLevelRepository;

  constructor(
    private mutations: InventoryMutationService,
    private reservations: InventoryReservationService,
    private ledger: InventoryLedgerService,
    private productRepo: IProductRepository,
    options: InventoryFlowServiceOptions = {},
  ) {
    this.reservationTtlMs = options.reservationTtlMs ?? DEFAULT_RESERVATION_TTL_MS;
    this.onReservationReleased = options.onReservationReleased;
    this.inventoryLevelRepo = options.inventoryLevelRepo;
  }

  async checkAvailability(input: CheckAvailabilityInput): Promise<InventoryResult<AvailabilityResult>> {
    return inventoryTry(async () => {
      const lines = await this.evaluateAvailability(input.items);
      return {
        available: lines.every((line) => line.sufficient),
        lines,
      };
    });
  }

  async reserveInventory(input: ReserveInventoryInput): Promise<InventoryResult<ReservationResult>> {
    if (!input.orderId?.trim()) return inventoryErr('INVALID_INPUT', 'orderId is required', false);
    if (!input.idempotencyKey?.trim()) return inventoryErr('INVALID_INPUT', 'idempotencyKey is required', false);
    if (!input.items.length) {
      return inventoryOk({
        reservationId: '',
        orderId: input.orderId,
        state: 'reserved',
        expiresAt: new Date().toISOString(),
        lines: [],
      });
    }

    const existing = await this.reservations.findByIdempotencyKey(input.idempotencyKey, input.transaction);
    if (this.reservations.isDuplicateReserve(existing)) {
      return inventoryOk(
        {
          reservationId: existing.id,
          orderId: existing.orderId,
          state: 'reserved',
          expiresAt: existing.expiresAt,
          lines: existing.lines,
        },
        true,
      );
    }

    const availability = await this.evaluateAvailability(input.items);
    if (!availability.every((line) => line.sufficient)) {
      return inventoryErr('INSUFFICIENT_STOCK', 'Insufficient stock for one or more items', false);
    }

    return inventoryTry(async () => {
      const expiresAt = input.expiresAt ?? new Date(Date.now() + this.reservationTtlMs).toISOString();
      const reservation = await this.reservations.createReservation({
        orderId: input.orderId,
        lines: input.items,
        idempotencyKey: input.idempotencyKey,
        expiresAt,
        transaction: input.transaction,
      });

      try {
        await this.mutations.applyDeltas(this.mutations.linesToNegativeDeltas(input.items), {
          reason: 'reservation_created',
          actor: input.actor,
          idempotencyKeyPrefix: this.ledger.ledgerKey('reserve', input.idempotencyKey),
          reservationId: reservation.id,
          orderId: input.orderId,
          transaction: input.transaction,
        });
      } catch (error) {
        if (error instanceof InsufficientStockError) {
          await this.reservations.transitionState(reservation, 'oversold_review', input.transaction).catch(() => {});
          await this.reservations.recordOversellCase({
            productId: input.items[0]?.productId ?? 'unknown',
            variantId: input.items[0]?.variantId,
            reservationId: reservation.id,
            orderId: input.orderId,
            reportedStock: 0,
            expectedStock: input.items[0]?.quantity ?? 0,
            transaction: input.transaction,
          });
        } else {
          await this.reservations.transitionState(reservation, 'released', input.transaction).catch(() => {});
        }
        throw error;
      }

      return {
        reservationId: reservation.id,
        orderId: input.orderId,
        state: 'reserved' as const,
        expiresAt,
        lines: input.items,
      };
    });
  }

  async confirmReservation(input: ConfirmReservationInput): Promise<InventoryResult<ConfirmReservationResult>> {
    if (!input.idempotencyKey?.trim()) return inventoryErr('INVALID_INPUT', 'idempotencyKey is required', false);

    const confirmLedgerKey = this.ledger.ledgerKey('confirm', input.idempotencyKey);
    const existingLedger = await this.ledger.findByIdempotencyKey(confirmLedgerKey);
    const reservation = await this.resolveReservation(input);
    if (!reservation) return inventoryErr('RESERVATION_NOT_FOUND', 'Inventory reservation not found', false);

    if (this.reservations.isDuplicateConfirm(reservation) || existingLedger) {
      return inventoryOk(
        { reservationId: reservation.id, orderId: reservation.orderId, state: 'committed' },
        true,
      );
    }

    if (reservation.state === 'released' || reservation.state === 'expired') {
      return inventoryErr('RESERVATION_INVALID_STATE', `Cannot confirm reservation in state ${reservation.state}`, false);
    }

    return inventoryTry(async () => {
      await this.reservations.transitionState(reservation, 'committed', input.transaction);
      await this.ledger.append({
        productId: reservation.lines[0]?.productId ?? 'unknown',
        reservationId: reservation.id,
        orderId: reservation.orderId,
        delta: 0,
        reason: 'reservation_confirmed',
        actor: input.actor,
        idempotencyKey: confirmLedgerKey,
        transaction: input.transaction,
      });
      return {
        reservationId: reservation.id,
        orderId: reservation.orderId,
        state: 'committed' as const,
      };
    });
  }

  async releaseReservation(input: ReleaseReservationInput): Promise<InventoryResult<ReleaseReservationResult>> {
    if (!input.idempotencyKey?.trim()) return inventoryErr('INVALID_INPUT', 'idempotencyKey is required', false);

    const releaseLedgerKey = this.ledger.ledgerKey('release', input.idempotencyKey);
    const existingLedger = await this.ledger.findByIdempotencyKey(releaseLedgerKey);
    const reservation = await this.resolveReservation(input);
    if (!reservation) return inventoryErr('RESERVATION_NOT_FOUND', 'Inventory reservation not found', false);

    if (this.reservations.isDuplicateRelease(reservation) || existingLedger) {
      return inventoryOk(
        {
          reservationId: reservation.id,
          orderId: reservation.orderId,
          state: reservation.state === 'expired' ? 'expired' : 'released',
          restoredLines: [],
        },
        true,
      );
    }

    if (reservation.state === 'committed') {
      return inventoryErr('RESERVATION_INVALID_STATE', 'Cannot release a committed reservation', false);
    }

    const nextState = input.reason === 'expired' ? 'expired' : 'released';
    const ledgerReason = input.reason === 'expired' ? 'reservation_expired' : 'reservation_released';

    return inventoryTry(async () => {
      if (reservation.state === 'reserved' || reservation.state === 'oversold_review') {
        await this.mutations.applyDeltas(this.mutations.linesToPositiveDeltas(reservation.lines), {
          reason: ledgerReason,
          actor: input.actor,
          idempotencyKeyPrefix: releaseLedgerKey,
          reservationId: reservation.id,
          orderId: reservation.orderId,
          transaction: input.transaction,
        });
      }

      await this.reservations.transitionState(reservation, nextState, input.transaction);
      await this.ledger.append({
        productId: reservation.lines[0]?.productId ?? 'batch',
        reservationId: reservation.id,
        orderId: reservation.orderId,
        delta: 0,
        reason: ledgerReason,
        actor: input.actor,
        idempotencyKey: releaseLedgerKey,
        transaction: input.transaction,
      });

      await this.onReservationReleased?.({ orderId: reservation.orderId, reason: input.reason });

      return {
        reservationId: reservation.id,
        orderId: reservation.orderId,
        state: nextState,
        restoredLines: reservation.lines,
      };
    });
  }

  async applyInventoryDeltas(input: ApplyInventoryDeltasInput): Promise<InventoryResult<ApplyDeltasResult>> {
    if (!input.idempotencyKey?.trim()) return inventoryErr('INVALID_INPUT', 'idempotencyKey is required', false);
    if (!input.deltas.length) return inventoryErr('INVALID_INPUT', 'deltas must not be empty', false);

    const markerKey = this.ledger.ledgerKey('deltas', input.idempotencyKey);
    const existing = await this.ledger.findByIdempotencyKey(markerKey);
    if (existing) {
      return inventoryOk({ applied: [] }, true);
    }

    return inventoryTry(async () => {
      const coalesced = input.deltas.filter((d) => d.delta !== 0);
      if (coalesced.length > 0) {
        await this.mutations.applyDeltas(
          coalesced.map((d) => ({ productId: d.productId, variantId: d.variantId, delta: d.delta })),
          {
            reason: input.reason,
            actor: input.actor,
            idempotencyKeyPrefix: markerKey,
            reservationId: input.reservationId,
            orderId: input.orderId,
            purchaseOrderId: input.purchaseOrderId,
            transaction: input.transaction,
          },
        );
      }
      await this.ledger.append({
        productId: coalesced[0]?.productId ?? 'batch',
        orderId: input.orderId,
        purchaseOrderId: input.purchaseOrderId,
        reservationId: input.reservationId,
        delta: 0,
        reason: input.reason,
        actor: input.actor,
        idempotencyKey: markerKey,
        transaction: input.transaction,
      });
      return { applied: coalesced };
    });
  }

  async adjustInventory(input: AdjustInventoryInput): Promise<InventoryResult<AdjustmentResult>> {
    if (!input.idempotencyKey?.trim()) return inventoryErr('INVALID_INPUT', 'idempotencyKey is required', false);
    if (!input.updates.length) return inventoryErr('INVALID_INPUT', 'updates must not be empty', false);

    const adjustMarkerKey = this.ledger.ledgerKey('adjust', input.idempotencyKey);
    const existing = await this.ledger.findByIdempotencyKey(adjustMarkerKey);
    if (existing) {
      return inventoryOk({ adjustments: [] }, true);
    }

    return inventoryTry(async () => {
      const adjustments = await this.mutations.setAbsoluteStock(
        input.updates.map((u) => ({
          productId: u.productId,
          variantId: u.variantId,
          stock: u.stock,
        })),
        {
          actor: input.actor,
          idempotencyKey: this.ledger.ledgerKey('adjust', input.idempotencyKey),
          transaction: input.transaction,
        },
      );
      await this.ledger.append({
        productId: input.updates[0]?.productId ?? 'batch',
        delta: 0,
        reason: 'admin_adjustment',
        actor: input.actor,
        idempotencyKey: adjustMarkerKey,
        transaction: input.transaction,
      });
      return { adjustments };
    });
  }

  async reconcileInventory(input: ReconcileInventoryInput): Promise<InventoryResult<ReconciliationResult>> {
    return inventoryTry(async () => {
      const { products } = await this.productRepo.getAll({ status: 'active', limit: 500 });
      const targetProducts = input.productIds?.length
        ? products.filter((p) => input.productIds!.includes(p.id))
        : products;

      const discrepancies: ReconciliationResult['discrepancies'] = [];

      for (const product of targetProducts) {
        const ledgerEntries = await this.ledger.listByProduct(product.id, { limit: 500 });
        const ledgerBalance = ledgerEntries.reduce((sum, entry) => sum + entry.delta, 0);
        const reportedStock = product.stock ?? 0;

        if (product.hasVariants && product.variants?.length) {
          for (const variant of product.variants) {
            const variantLedger = ledgerEntries
              .filter((e) => e.variantId === variant.id)
              .reduce((sum, entry) => sum + entry.delta, 0);
            const discrepancy = (variant.stock ?? 0) - variantLedger;
            if (discrepancy !== 0) {
              const caseId = await this.reservations.recordOversellCase({
                productId: product.id,
                variantId: variant.id,
                reportedStock: variant.stock ?? 0,
                expectedStock: variantLedger,
              });
              discrepancies.push({
                productId: product.id,
                variantId: variant.id,
                reportedStock: variant.stock ?? 0,
                ledgerBalance: variantLedger,
                discrepancy,
                caseId,
              });
            }
          }
          continue;
        }

        const discrepancy = reportedStock - ledgerBalance;
        if (discrepancy !== 0) {
          const caseId = await this.reservations.recordOversellCase({
            productId: product.id,
            reportedStock,
            expectedStock: ledgerBalance,
          });
          discrepancies.push({
            productId: product.id,
            reportedStock,
            ledgerBalance,
            discrepancy,
            caseId,
          });
        }
      }

      return { scanned: targetProducts.length, discrepancies };
    });
  }

  async getProductLedger(input: GetProductLedgerInput): Promise<InventoryResult<GetProductLedgerResult>> {
    if (!input.productId?.trim()) return inventoryErr('INVALID_INPUT', 'productId is required', false);

    const product = await this.productRepo.getById(input.productId);
    if (!product) {
      return inventoryErr('PRODUCT_NOT_FOUND', `Product ${input.productId} not found`, false);
    }

    const entries = await this.ledger.listByProduct(input.productId, { limit: input.limit ?? 100 });
    return inventoryOk({ productId: input.productId, entries });
  }

  async receiveStockAtLocation(
    input: ReceiveStockAtLocationInput,
  ): Promise<InventoryResult<ReceiveStockAtLocationResult>> {
    if (!this.inventoryLevelRepo) {
      return inventoryErr('INVALID_INPUT', 'Location inventory is not configured on the inventory stack', false);
    }
    if (!input.idempotencyKey?.trim()) return inventoryErr('INVALID_INPUT', 'idempotencyKey is required', false);

    const receiveMarkerKey = this.ledger.ledgerKey('receive', input.idempotencyKey);
    const existingReceive = await this.ledger.findByIdempotencyKey(receiveMarkerKey);
    if (existingReceive) {
      return inventoryOk({ catalog: { applied: [] }, locations: [] }, true);
    }

    const stockableItems = input.items.filter((item) => item.delta > 0);
    if (stockableItems.length === 0) {
      return inventoryOk({ catalog: { applied: [] }, locations: [] });
    }

    const catalogResult = await this.applyInventoryDeltas({
      deltas: stockableItems.map((item) => ({
        productId: item.productId,
        variantId: item.variantId,
        delta: item.delta,
      })),
      idempotencyKey: this.ledger.ledgerKey('receive-catalog', input.idempotencyKey),
      actor: input.actor,
      reason: 'location_receive',
      purchaseOrderId: input.purchaseOrderId,
      transaction: input.transaction,
    });
    if (!catalogResult.ok) return catalogResult;

    const locations: ReceiveStockAtLocationResult['locations'] = [];
    const completedLines: typeof stockableItems = [];

    try {
      for (const item of stockableItems) {
        const level = await this.inventoryLevelRepo.adjustQuantity(
          item.productId,
          item.locationId,
          item.delta,
          input.locationReason ?? 'Stock received',
          input.transaction,
        );
        locations.push({
          productId: item.productId,
          variantId: item.variantId,
          locationId: item.locationId,
          delta: item.delta,
          availableQty: level.availableQty,
        });
        completedLines.push(item);

        await this.ledger.append({
          productId: item.productId,
          variantId: item.variantId,
          locationId: item.locationId,
          purchaseOrderId: input.purchaseOrderId,
          delta: item.delta,
          reason: 'location_receive',
          actor: input.actor,
          idempotencyKey: this.ledger.ledgerKey(
            receiveMarkerKey,
            'line',
            item.productId,
            item.locationId,
            item.variantId,
          ),
          transaction: input.transaction,
        });
      }
    } catch (error) {
      if (input.transaction) throw error;

      const rollbackMessage = error instanceof Error ? error.message : 'Location inventory receive failed';
      await this.rollbackReceiveStock({
        stockableItems,
        completedLines,
        input,
        rollbackMessage,
      });

      return inventoryErr('LOCATION_RECEIVE_FAILED', rollbackMessage, true);
    }

    await this.ledger.append({
      productId: stockableItems[0]?.productId ?? 'batch',
      locationId: stockableItems[0]?.locationId,
      purchaseOrderId: input.purchaseOrderId,
      delta: 0,
      reason: 'location_receive',
      actor: input.actor,
      idempotencyKey: receiveMarkerKey,
      transaction: input.transaction,
    });

    return inventoryOk({ catalog: catalogResult.data, locations });
  }

  private async rollbackReceiveStock(params: {
    stockableItems: ReceiveStockAtLocationInput['items'];
    completedLines: ReceiveStockAtLocationInput['items'];
    input: ReceiveStockAtLocationInput;
    rollbackMessage: string;
  }): Promise<void> {
    const { stockableItems, completedLines, input, rollbackMessage } = params;
    const rollbackPrefix = this.ledger.ledgerKey('receive-rollback', input.idempotencyKey);

    try {
      await this.mutations.applyDeltas(
        stockableItems.map((item) => ({
          productId: item.productId,
          variantId: item.variantId,
          delta: -item.delta,
        })),
        {
          reason: 'location_receive',
          actor: input.actor,
          idempotencyKeyPrefix: rollbackPrefix,
          purchaseOrderId: input.purchaseOrderId,
        },
      );
    } catch (rollbackErr) {
      logger.error('Catalog rollback failed after location receive failure', { rollbackErr, rollbackMessage });
    }

    for (const line of completedLines) {
      try {
        await this.inventoryLevelRepo!.adjustQuantity(
          line.productId,
          line.locationId,
          -line.delta,
          `Rollback: ${rollbackMessage}`,
        );
      } catch (locationRollbackErr) {
        logger.error('Location rollback failed after partial receive', { line, locationRollbackErr });
      }
    }
  }

  async cleanupExpiredReservations(
    input: CleanupExpiredReservationsInput,
  ): Promise<InventoryResult<CleanupReservationsReport>> {
    const before = input.before ?? new Date().toISOString();
    const limit = input.limit ?? 100;

    return inventoryTry(async () => {
      const expired = await this.reservations.listExpired(before, limit);
      const report: CleanupReservationsReport = {
        scanned: expired.length,
        expired: expired.length,
        released: 0,
        failed: 0,
        errors: [],
      };

      for (const reservation of expired) {
        const result = await this.releaseReservation({
          orderId: reservation.orderId,
          reservationId: reservation.id,
          idempotencyKey: this.ledger.ledgerKey('cleanup', reservation.id),
          actor: 'system',
          reason: 'expired',
        });

        if (result.ok) {
          report.released += 1;
        } else {
          report.failed += 1;
          report.errors.push({
            reservationId: reservation.id,
            orderId: reservation.orderId,
            code: result.code === 'RESERVATION_NOT_FOUND' ? 'not_found' : 'release_failed',
            message: result.message,
            retryable: result.retryable,
          });
        }
      }

      return report;
    });
  }

  private async resolveReservation(input: {
    orderId?: string;
    reservationId?: string;
    transaction?: unknown;
  }) {
    if (input.reservationId) {
      return this.reservations.getById(input.reservationId, input.transaction);
    }
    if (input.orderId) {
      return this.reservations.findForOrder(input.orderId, input.transaction);
    }
    return null;
  }

  private async evaluateAvailability(items: InventoryLineItem[]) {
    const coalesced = new Map<string, InventoryLineItem>();
    for (const item of items) {
      const key = item.variantId ? `${item.productId}:${item.variantId}` : item.productId;
      const existing = coalesced.get(key);
      if (existing) existing.quantity += item.quantity;
      else coalesced.set(key, { ...item });
    }

    const lines: AvailabilityResult['lines'] = [];
    for (const item of coalesced.values()) {
      const available = await this.mutations.readStock(item.productId, item.variantId);
      lines.push({
        productId: item.productId,
        variantId: item.variantId,
        requested: item.quantity,
        available,
        sufficient: available >= item.quantity,
      });
    }
    return lines;
  }
}
