import type {
  IInventoryLedgerRepository,
  IInventoryLevelRepository,
  IInventoryReconciliationRepository,
  IInventoryReservationRepository,
} from '@domain/repositories';
import type {
  InventoryLedgerEntry,
  InventoryReconciliationCase,
  InventoryReservation,
  InventoryReservationState,
} from '@domain/inventory';
import type { InventoryLevel } from '@domain/models';
import * as crypto from 'node:crypto';

export class InMemoryInventoryLedgerRepository implements IInventoryLedgerRepository {
  entries: InventoryLedgerEntry[] = [];

  async append(
    entry: Omit<InventoryLedgerEntry, 'id' | 'createdAt'>,
    _transaction?: unknown,
  ): Promise<InventoryLedgerEntry> {
    const record: InventoryLedgerEntry = {
      ...entry,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    this.entries.push(record);
    return record;
  }

  async findByIdempotencyKey(key: string): Promise<InventoryLedgerEntry | null> {
    return this.entries.find((e) => e.idempotencyKey === key) ?? null;
  }

  async listByProduct(productId: string, options?: { limit?: number }): Promise<InventoryLedgerEntry[]> {
    return this.entries.filter((e) => e.productId === productId).slice(0, options?.limit ?? 100);
  }
}

export class InMemoryInventoryReservationRepository implements IInventoryReservationRepository {
  reservations = new Map<string, InventoryReservation>();

  async create(
    reservation: Omit<InventoryReservation, 'id' | 'createdAt' | 'updatedAt'>,
    _transaction?: unknown,
  ): Promise<InventoryReservation> {
    const record: InventoryReservation = {
      ...reservation,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.reservations.set(record.id, record);
    return record;
  }

  async getById(id: string): Promise<InventoryReservation | null> {
    return this.reservations.get(id) ?? null;
  }

  async getByOrderId(orderId: string): Promise<InventoryReservation | null> {
    return [...this.reservations.values()].find((r) => r.orderId === orderId) ?? null;
  }

  async getByIdempotencyKey(key: string): Promise<InventoryReservation | null> {
    return [...this.reservations.values()].find((r) => r.idempotencyKey === key) ?? null;
  }

  async updateState(
    id: string,
    state: InventoryReservationState,
    updates?: Partial<Pick<InventoryReservation, 'confirmedAt' | 'releasedAt'>>,
  ): Promise<InventoryReservation> {
    const existing = this.reservations.get(id);
    if (!existing) throw new Error(`Reservation ${id} not found`);
    const next = { ...existing, ...updates, state, updatedAt: new Date().toISOString() };
    this.reservations.set(id, next);
    return next;
  }

  async listExpiredReserved(before: string, max = 100): Promise<InventoryReservation[]> {
    return [...this.reservations.values()]
      .filter((r) => r.state === 'reserved' && r.expiresAt < before)
      .slice(0, max);
  }
}

export class InMemoryInventoryReconciliationRepository implements IInventoryReconciliationRepository {
  cases: InventoryReconciliationCase[] = [];

  async create(kase: Omit<InventoryReconciliationCase, 'id' | 'createdAt'>): Promise<InventoryReconciliationCase> {
    const record: InventoryReconciliationCase = {
      ...kase,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    this.cases.push(record);
    return record;
  }
}

export class InMemoryInventoryLevelRepository implements IInventoryLevelRepository {
  levels = new Map<string, InventoryLevel>();
  adjustCalls: Array<{ productId: string; locationId: string; delta: number; reason: string }> = [];
  failOnCall?: number;

  private key(productId: string, locationId: string): string {
    return `${productId}_${locationId}`;
  }

  async findByProduct(productId: string): Promise<InventoryLevel[]> {
    return [...this.levels.values()].filter((level) => level.productId === productId);
  }

  async findByLocation(locationId: string): Promise<InventoryLevel[]> {
    return [...this.levels.values()].filter((level) => level.locationId === locationId);
  }

  async findByProductAndLocation(productId: string, locationId: string): Promise<InventoryLevel | null> {
    return this.levels.get(this.key(productId, locationId)) ?? null;
  }

  async save(level: InventoryLevel): Promise<InventoryLevel> {
    this.levels.set(this.key(level.productId, level.locationId), level);
    return level;
  }

  async adjustQuantity(
    productId: string,
    locationId: string,
    delta: number,
    reason: string,
    _transaction?: unknown,
  ): Promise<InventoryLevel> {
    this.adjustCalls.push({ productId, locationId, delta, reason });
    if (this.failOnCall === this.adjustCalls.length) {
      throw new Error(`Location adjust blocked for ${productId}@${locationId}`);
    }

    const existing = this.levels.get(this.key(productId, locationId));
    const nextQty = (existing?.availableQty ?? 0) + delta;
    if (nextQty < 0) {
      throw new Error(`Insufficient location inventory for ${productId}@${locationId}`);
    }

    const level: InventoryLevel = {
      productId,
      locationId,
      availableQty: nextQty,
      reservedQty: existing?.reservedQty ?? 0,
      incomingQty: existing?.incomingQty ?? 0,
      reorderPoint: existing?.reorderPoint ?? 0,
      reorderQty: existing?.reorderQty ?? 0,
      updatedAt: new Date(),
    };
    this.levels.set(this.key(productId, locationId), level);
    return level;
  }

  async updateReorderPoint(productId: string, locationId: string, reorderPoint: number, reorderQty: number): Promise<InventoryLevel> {
    const existing = this.levels.get(this.key(productId, locationId));
    const level: InventoryLevel = {
      productId,
      locationId,
      availableQty: existing?.availableQty ?? 0,
      reservedQty: existing?.reservedQty ?? 0,
      incomingQty: existing?.incomingQty ?? 0,
      reorderPoint,
      reorderQty,
      updatedAt: new Date(),
    };
    this.levels.set(this.key(productId, locationId), level);
    return level;
  }
}
