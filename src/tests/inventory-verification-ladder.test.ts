import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createInventoryStack } from '@core/inventory/createInventoryStack';
import { inventoryFromError } from '@core/inventory/inventoryResult';
import { DomainError, InsufficientStockError } from '@domain/errors';
import {
  InMemoryInventoryLedgerRepository,
  InMemoryInventoryReconciliationRepository,
  InMemoryInventoryReservationRepository,
} from './helpers/inMemoryInventoryStores';

function makeStack(stockByProduct: Record<string, number> = { p1: 10 }) {
  const stocks = { ...stockByProduct };
  const productRepo = {
    getById: vi.fn(async (id: string) => {
      if (!(id in stocks)) return null;
      return {
        id,
        stock: stocks[id] ?? 0,
        variants: [],
      };
    }),
    getAll: vi.fn(async () => ({ products: Object.keys(stocks).map((id) => ({ id, stock: stocks[id] })) })),
    batchUpdateStock: vi.fn(async (updates: Array<{ id: string; delta: number }>) => {
      for (const update of updates) {
        stocks[update.id] = (stocks[update.id] ?? 0) + update.delta;
      }
    }),
  };

  const ledgerRepo = new InMemoryInventoryLedgerRepository();
  const reservationRepo = new InMemoryInventoryReservationRepository();
  const reconciliationRepo = new InMemoryInventoryReconciliationRepository();
  const stack = createInventoryStack({
    productRepo: productRepo as any,
    ledgerRepo,
    reservationRepo,
    reconciliationRepo,
  });

  return { ...stack, productRepo, stocks, ledgerRepo, reservationRepo, reconciliationRepo };
}

describe('Inventory verification ladder (frozen protocol)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('[expected failures] maps InsufficientStockError to INSUFFICIENT_STOCK InventoryResult', () => {
    const result = inventoryFromError(new InsufficientStockError('p1', 5, 1));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe('INSUFFICIENT_STOCK');
    expect(result.retryable).toBe(false);
  });

  it('[expected failures] maps DomainError to DOMAIN_ERROR InventoryResult', () => {
    const result = inventoryFromError(new DomainError('Stock mutations must go through protocol'));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe('DOMAIN_ERROR');
    expect(result.retryable).toBe(false);
  });

  it('[unexpected crash] maps transient errors to UNKNOWN retryable contract', () => {
    const result = inventoryFromError(new Error('Firestore unavailable — retry'));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe('UNKNOWN');
    expect(result.retryable).toBe(true);
  });

  it('[reserve insufficient] returns INSUFFICIENT_STOCK without mutating stock', async () => {
    const { inventory, stocks, productRepo } = makeStack({ p1: 1 });
    const result = await inventory.reserveInventory({
      orderId: 'order-insufficient',
      items: [{ productId: 'p1', quantity: 3 }],
      idempotencyKey: 'checkout:insufficient',
      actor: 'checkout',
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe('INSUFFICIENT_STOCK');
    expect(stocks.p1).toBe(1);
    expect(productRepo.batchUpdateStock).not.toHaveBeenCalled();
  });

  it('[ledger read] returns append-only entries for a product', async () => {
    const { inventory, ledgerRepo } = makeStack({ p1: 4 });
    await inventory.adjustInventory({
      updates: [{ productId: 'p1', stock: 6 }],
      idempotencyKey: 'admin:ledger-proof',
      actor: 'admin',
    });

    const ledger = await inventory.getProductLedger({ productId: 'p1' });
    expect(ledger.ok).toBe(true);
    if (!ledger.ok) return;
    expect(ledger.data.productId).toBe('p1');
    expect(ledger.data.entries.length).toBeGreaterThan(0);
    expect(ledgerRepo.entries.every((entry) => entry.productId === 'p1')).toBe(true);
  });

  it('[ledger read] returns PRODUCT_NOT_FOUND for missing catalog rows', async () => {
    const { inventory } = makeStack({ p1: 1 });
    const result = await inventory.getProductLedger({ productId: 'missing-product' });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe('PRODUCT_NOT_FOUND');
  });

  it('[cleanup partial failure] returns ok report with failures, does not throw', async () => {
    const { inventory, reservationRepo } = makeStack({ p1: 2 });
    reservationRepo.reservations.set('broken-release', {
      id: 'broken-release',
      orderId: 'order-broken',
      state: 'released',
      lines: [{ productId: 'p1', quantity: 1 }],
      idempotencyKey: 'checkout:broken',
      expiresAt: new Date(Date.now() - 60_000).toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    reservationRepo.reservations.set('expired-ok', {
      id: 'expired-ok',
      orderId: 'order-ok',
      state: 'reserved',
      lines: [{ productId: 'p1', quantity: 1 }],
      idempotencyKey: 'checkout:expired-ok',
      expiresAt: new Date(Date.now() - 60_000).toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const report = await inventory.cleanupExpiredReservations({ limit: 10 });
    expect(report.ok).toBe(true);
    if (!report.ok) return;
    expect(report.data.scanned).toBeGreaterThanOrEqual(1);
    expect(report.data.released + report.data.failed).toBe(report.data.expired);
  });

  it('[client idempotency] duplicate adjustInventory with same key does not double-apply', async () => {
    const { inventory, stocks } = makeStack({ p1: 2 });
    const input = {
      updates: [{ productId: 'p1', stock: 9 }],
      idempotencyKey: 'admin:client-proof-1',
      actor: 'admin' as const,
    };
    const first = await inventory.adjustInventory(input);
    const second = await inventory.adjustInventory(input);
    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    if (!second.ok || !first.ok) return;
    expect(second.duplicate).toBe(true);
    expect(stocks.p1).toBe(9);
  });
});
