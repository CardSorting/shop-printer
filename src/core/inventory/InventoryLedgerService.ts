import * as crypto from 'node:crypto';
import type {
  IInventoryLedgerRepository,
} from '@domain/repositories';
import type {
  InventoryActor,
  InventoryLedgerEntry,
  InventoryLedgerReason,
} from '@domain/inventory';
import type { ICommerceEventBus } from '../commerce/commerceEventBus';
import { mapInventoryLedgerToEnvelope } from '../commerce/commerceEventMappers';
import {
  isInPostCommitCommerceScope,
  queuePostCommitCommerceEvent,
} from '../commerce/postCommitCommerceEvents';

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
  constructor(
    private ledgerRepo: IInventoryLedgerRepository,
    private commerceEventBus?: ICommerceEventBus,
  ) {}

  async append(input: AppendLedgerInput): Promise<InventoryLedgerEntry> {
    const existing = await this.ledgerRepo.findByIdempotencyKey(input.idempotencyKey);
    if (existing) return existing;

    const entry = await this.ledgerRepo.append(
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
    const envelope = mapInventoryLedgerToEnvelope(entry);
    if (isInPostCommitCommerceScope()) {
      queuePostCommitCommerceEvent(envelope as any);
    } else if (this.commerceEventBus && !input.transaction) {
      await this.commerceEventBus.publish(envelope as any);
    }
    return entry;
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
