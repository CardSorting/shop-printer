import * as crypto from 'node:crypto';
import type {
  IInventoryLedgerRepository,
} from '@domain/repositories';
import type {
  InventoryActor,
  InventoryLedgerEntry,
  InventoryLedgerReason,
} from '@domain/inventory';

export type AppendLedgerInput = {
  productId: string;
  variantId?: string;
  locationId?: string;
  purchaseOrderId?: string;
  reservationId?: string;
  orderId?: string;
  delta: number;
  reason: InventoryLedgerReason;
  actor: InventoryActor;
  idempotencyKey: string;
  transaction?: unknown;
};

/**
 * Append-only inventory audit log. Every stock mutation must create a ledger entry.
 */
export class InventoryLedgerService {
  constructor(private ledgerRepo: IInventoryLedgerRepository) {}

  async append(input: AppendLedgerInput): Promise<InventoryLedgerEntry> {
    const existing = await this.ledgerRepo.findByIdempotencyKey(input.idempotencyKey);
    if (existing) return existing;

    return this.ledgerRepo.append(
      {
        productId: input.productId,
        variantId: input.variantId,
        locationId: input.locationId,
        purchaseOrderId: input.purchaseOrderId,
        reservationId: input.reservationId,
        orderId: input.orderId,
        delta: input.delta,
        reason: input.reason,
        actor: input.actor,
        idempotencyKey: input.idempotencyKey,
      },
      input.transaction,
    );
  }

  async appendBatch(
    entries: AppendLedgerInput[],
    transaction?: unknown,
  ): Promise<InventoryLedgerEntry[]> {
    const results: InventoryLedgerEntry[] = [];
    for (const entry of entries) {
      results.push(await this.append({ ...entry, transaction }));
    }
    return results;
  }

  ledgerKey(prefix: string, ...parts: (string | number | undefined)[]): string {
    return [prefix, ...parts.filter((p) => p !== undefined && p !== '')].join(':');
  }

  newEntryId(): string {
    return crypto.randomUUID();
  }

  findByIdempotencyKey(key: string): Promise<InventoryLedgerEntry | null> {
    return this.ledgerRepo.findByIdempotencyKey(key);
  }

  listByProduct(productId: string, options?: { limit?: number }): Promise<InventoryLedgerEntry[]> {
    return this.ledgerRepo.listByProduct(productId, options);
  }
}
