import type { IProductRepository } from '@domain/repositories';
import type { InventoryLineItem } from '@domain/inventory';
import { ProductNotFoundError } from '@domain/errors';
import { coalesceStockUpdates } from '@domain/rules';
import type { InventoryLedgerService } from './InventoryLedgerService';
import type { InventoryActor } from '@domain/inventory';

export type StockDeltaUpdate = { productId: string; variantId?: string; delta: number };

/**
 * Applies cached stock counts via ProductCatalog / VariantStore (IProductRepository).
 * Never call productRepo.batchUpdateStock outside this service.
 */
export class InventoryMutationService {
  constructor(
    private productRepo: IProductRepository,
    private ledger: InventoryLedgerService,
  ) {}

  async readStock(productId: string, variantId?: string, transaction?: unknown): Promise<number> {
    const product = await this.productRepo.getById(productId, transaction);
    if (!product) throw new ProductNotFoundError(productId);
    if (variantId) {
      const variant = product.variants?.find((v) => v.id === variantId);
      return variant?.stock ?? 0;
    }
    return product.stock ?? 0;
  }

  async applyDeltas(
    updates: StockDeltaUpdate[],
    context: {
      reason: import('@domain/inventory').InventoryLedgerReason;
      actor: InventoryActor;
      idempotencyKeyPrefix: string;
      reservationId?: string;
      orderId?: string;
      purchaseOrderId?: string;
      transaction?: unknown;
    },
  ): Promise<void> {
    const coalesced = coalesceStockUpdates(
      updates.map((u) => ({ id: u.productId, variantId: u.variantId, delta: u.delta })),
    );
    if (coalesced.length === 0) return;

    await this.productRepo.batchUpdateStock(coalesced, context.transaction);

    await this.ledger.appendBatch(
      coalesced.map((update, index) => ({
        productId: update.id,
        variantId: update.variantId,
        reservationId: context.reservationId,
        orderId: context.orderId,
        purchaseOrderId: context.purchaseOrderId,
        delta: update.delta,
        reason: context.reason,
        actor: context.actor,
        idempotencyKey: this.ledger.ledgerKey(
          context.idempotencyKeyPrefix,
          update.id,
          update.variantId,
          index,
        ),
        transaction: context.transaction,
      })),
      context.transaction,
    );
  }

  async setAbsoluteStock(
    updates: { productId: string; variantId?: string; stock: number }[],
    context: {
      actor: InventoryActor;
      idempotencyKey: string;
      transaction?: unknown;
    },
  ): Promise<Array<{ productId: string; variantId?: string; previousStock: number; newStock: number; delta: number }>> {
    const results: Array<{ productId: string; variantId?: string; previousStock: number; newStock: number; delta: number }> = [];
    const deltas: StockDeltaUpdate[] = [];

    for (const update of updates) {
      const previousStock = await this.readStock(update.productId, update.variantId, context.transaction);
      const delta = update.stock - previousStock;
      if (delta === 0) {
        results.push({
          productId: update.productId,
          variantId: update.variantId,
          previousStock,
          newStock: update.stock,
          delta: 0,
        });
        continue;
      }
      deltas.push({ productId: update.productId, variantId: update.variantId, delta });
      results.push({
        productId: update.productId,
        variantId: update.variantId,
        previousStock,
        newStock: update.stock,
        delta,
      });
    }

    if (deltas.length > 0) {
      await this.applyDeltas(deltas, {
        reason: 'admin_adjustment',
        actor: context.actor,
        idempotencyKeyPrefix: context.idempotencyKey,
        transaction: context.transaction,
      });
    }

    return results;
  }

  linesToNegativeDeltas(items: InventoryLineItem[]): StockDeltaUpdate[] {
    return items.map((item) => ({
      productId: item.productId,
      variantId: item.variantId,
      delta: -item.quantity,
    }));
  }

  linesToPositiveDeltas(items: InventoryLineItem[]): StockDeltaUpdate[] {
    return items.map((item) => ({
      productId: item.productId,
      variantId: item.variantId,
      delta: item.quantity,
    }));
  }
}
