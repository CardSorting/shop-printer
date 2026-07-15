import * as crypto from 'node:crypto';
import type {
  IInventoryReconciliationRepository,
  IInventoryReservationRepository,
} from '@domain/repositories';
import type { InventoryLineItem, InventoryReservation, InventoryReservationState } from '@domain/inventory';

const TERMINAL_RESERVATION_STATES: InventoryReservationState[] = [
  'committed',
  'released',
  'expired',
];

/**
 * Reservation lifecycle — temporary claims on stock before commit or release.
 */
export class InventoryReservationService {
  constructor(
    private reservationRepo: IInventoryReservationRepository,
    private reconciliationRepo?: IInventoryReconciliationRepository,
  ) {}

  async findByIdempotencyKey(key: string, transaction?: unknown): Promise<InventoryReservation | null> {
    return this.reservationRepo.getByIdempotencyKey(key, transaction);
  }

  async findForOrder(orderId: string, transaction?: unknown): Promise<InventoryReservation | null> {
    return this.reservationRepo.getByOrderId(orderId, transaction);
  }

  async createReservation(input: {
    orderId: string;
    lines: InventoryLineItem[];
    idempotencyKey: string;
    expiresAt: string;
    transaction?: unknown;
  }): Promise<InventoryReservation> {
    return this.reservationRepo.create(
      {
        orderId: input.orderId,
        state: 'reserved',
        lines: input.lines,
        idempotencyKey: input.idempotencyKey,
        expiresAt: input.expiresAt,
      },
      input.transaction,
    );
  }

  async transitionState(
    reservation: InventoryReservation,
    nextState: InventoryReservationState,
    transaction?: unknown,
  ): Promise<InventoryReservation> {
    const updates: Partial<Pick<InventoryReservation, 'confirmedAt' | 'releasedAt'>> = {};
    if (nextState === 'committed') updates.confirmedAt = new Date().toISOString();
    if (nextState === 'released' || nextState === 'expired') updates.releasedAt = new Date().toISOString();
    return this.reservationRepo.updateState(reservation.id, nextState, updates, transaction);
  }

  isTerminal(state: InventoryReservationState): boolean {
    return TERMINAL_RESERVATION_STATES.includes(state);
  }

  isDuplicateReserve(existing: InventoryReservation | null): boolean {
    return !!existing && (existing.state === 'reserved' || existing.state === 'committed');
  }

  isDuplicateConfirm(existing: InventoryReservation | null): boolean {
    return !!existing && existing.state === 'committed';
  }

  isDuplicateRelease(existing: InventoryReservation | null): boolean {
    return !!existing && (existing.state === 'released' || existing.state === 'expired');
  }

  async recordOversellCase(input: {
    productId: string;
    variantId?: string;
    reservationId?: string;
    orderId?: string;
    reportedStock: number;
    expectedStock: number;
    transaction?: unknown;
  }): Promise<string> {
    if (!this.reconciliationRepo) return crypto.randomUUID();
    const kase = await this.reconciliationRepo.create(
      {
        productId: input.productId,
        variantId: input.variantId,
        reservationId: input.reservationId,
        orderId: input.orderId,
        reportedStock: input.reportedStock,
        expectedStock: input.expectedStock,
        discrepancy: input.reportedStock - input.expectedStock,
        state: 'oversold_review',
      },
      input.transaction,
    );
    return kase.id;
  }

  async listExpired(before: string, limit?: number): Promise<InventoryReservation[]> {
    return this.reservationRepo.listExpiredReserved(before, limit);
  }

  getById(id: string, transaction?: unknown): Promise<InventoryReservation | null> {
    return this.reservationRepo.getById(id, transaction);
  }
}
