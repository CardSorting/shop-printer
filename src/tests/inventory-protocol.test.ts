import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createInventoryStack } from '@core/inventory/createInventoryStack';
import {
  InMemoryInventoryLedgerRepository,
  InMemoryInventoryReconciliationRepository,
  InMemoryInventoryReservationRepository,
} from './helpers/inMemoryInventoryStores';

function makeStack(stockByProduct: Record<string, number> = { p1: 10 }) {
  const stocks = { ...stockByProduct };
  const variants: Record<string, Record<string, number>> = {};
  const productRepo = {
    getById: vi.fn(async (id: string) => ({
      id,
      stock: stocks[id] ?? 0,
      variants: variants[id]
        ? Object.entries(variants[id]).map(([vid, stock]) => ({ id: vid, stock }))
        : [],
    })),
    getAll: vi.fn(async () => ({ products: Object.keys(stocks).map((id) => ({ id, stock: stocks[id] })) })),
    batchUpdateStock: vi.fn(async (updates: Array<{ id: string; variantId?: string; delta: number }>) => {
      for (const update of updates) {
        if (update.variantId) {
          variants[update.id] = variants[update.id] ?? {};
          variants[update.id][update.variantId] = (variants[update.id][update.variantId] ?? 0) + update.delta;
          stocks[update.id] = Object.values(variants[update.id]).reduce((sum, qty) => sum + qty, 0);
        } else {
          stocks[update.id] = (stocks[update.id] ?? 0) + update.delta;
        }
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

describe('Inventory protocol (boundary consolidation pass)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('[availability] reports insufficient stock without mutating', async () => {
    const { inventory, productRepo } = makeStack({ p1: 1 });
    const result = await inventory.checkAvailability({
      items: [{ productId: 'p1', quantity: 2 }],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.available).toBe(false);
    expect(productRepo.batchUpdateStock).not.toHaveBeenCalled();
  });

  it('[reserve] decrements stock, creates reservation, and writes ledger entries', async () => {
    const { inventory, stocks, ledgerRepo } = makeStack({ p1: 5 });
    const result = await inventory.reserveInventory({
      orderId: 'order-1',
      items: [{ productId: 'p1', quantity: 2 }],
      idempotencyKey: 'checkout:attempt-1',
      actor: 'checkout',
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(stocks.p1).toBe(3);
    expect(ledgerRepo.entries.some((e) => e.reason === 'reservation_created' && e.delta === -2)).toBe(true);
  });

  it('[idempotency] duplicate reserve does not double-decrement', async () => {
    const { inventory, stocks } = makeStack({ p1: 5 });
    const input = {
      orderId: 'order-dup',
      items: [{ productId: 'p1', quantity: 1 }],
      idempotencyKey: 'checkout:dup-reserve',
      actor: 'checkout' as const,
    };
    const first = await inventory.reserveInventory(input);
    const second = await inventory.reserveInventory(input);
    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    if (!second.ok || !first.ok) return;
    expect(second.duplicate).toBe(true);
    expect(stocks.p1).toBe(4);
  });

  it('[confirm] marks reservation committed without changing stock again', async () => {
    const { inventory, stocks } = makeStack({ p1: 3 });
    await inventory.reserveInventory({
      orderId: 'order-confirm',
      items: [{ productId: 'p1', quantity: 1 }],
      idempotencyKey: 'checkout:confirm-1',
      actor: 'checkout',
    });
    const stockAfterReserve = stocks.p1;
    const confirm = await inventory.confirmReservation({
      orderId: 'order-confirm',
      idempotencyKey: 'confirm:pi_1',
      actor: 'checkout',
    });
    expect(confirm.ok).toBe(true);
    expect(stocks.p1).toBe(stockAfterReserve);
    const duplicate = await inventory.confirmReservation({
      orderId: 'order-confirm',
      idempotencyKey: 'confirm:pi_1',
      actor: 'checkout',
    });
    expect(duplicate.ok).toBe(true);
    if (duplicate.ok) expect(duplicate.duplicate).toBe(true);
  });

  it('[release] restores stock and is idempotent via ledger marker', async () => {
    const { inventory, stocks } = makeStack({ p1: 4 });
    await inventory.reserveInventory({
      orderId: 'order-release',
      items: [{ productId: 'p1', quantity: 2 }],
      idempotencyKey: 'checkout:release-1',
      actor: 'checkout',
    });
    expect(stocks.p1).toBe(2);
    const release = await inventory.releaseReservation({
      orderId: 'order-release',
      idempotencyKey: 'release:attempt-1',
      actor: 'checkout',
      reason: 'payment_failed',
    });
    expect(release.ok).toBe(true);
    expect(stocks.p1).toBe(4);
    const duplicate = await inventory.releaseReservation({
      orderId: 'order-release',
      idempotencyKey: 'release:attempt-1',
      actor: 'checkout',
      reason: 'payment_failed',
    });
    expect(duplicate.ok).toBe(true);
    if (duplicate.ok) expect(duplicate.duplicate).toBe(true);
    expect(stocks.p1).toBe(4);
  });

  it('[applyInventoryDeltas] applies delta mutations with idempotency marker', async () => {
    const { inventory, stocks, ledgerRepo } = makeStack({ p1: 3 });
    const input = {
      deltas: [{ productId: 'p1', delta: 2 }],
      idempotencyKey: 'fulfillment:restock:1',
      actor: 'fulfillment' as const,
      reason: 'reconciliation' as const,
    };
    const first = await inventory.applyInventoryDeltas(input);
    const second = await inventory.applyInventoryDeltas(input);
    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    if (!second.ok || !first.ok) return;
    expect(second.duplicate).toBe(true);
    expect(stocks.p1).toBe(5);
    expect(ledgerRepo.entries.some((e) => e.idempotencyKey === 'deltas:fulfillment:restock:1')).toBe(true);
  });

  it('[adjust] admin correction writes ledger entries with idempotency', async () => {
    const { inventory, stocks, ledgerRepo } = makeStack({ p1: 2 });
    const result = await inventory.adjustInventory({
      updates: [{ productId: 'p1', stock: 7 }],
      idempotencyKey: 'admin:adjust-1',
      actor: 'admin',
    });
    expect(result.ok).toBe(true);
    expect(stocks.p1).toBe(7);
    expect(ledgerRepo.entries.some((e) => e.reason === 'admin_adjustment' && e.delta === 5)).toBe(true);
    const duplicate = await inventory.adjustInventory({
      updates: [{ productId: 'p1', stock: 7 }],
      idempotencyKey: 'admin:adjust-1',
      actor: 'admin',
    });
    expect(duplicate.ok).toBe(true);
    if (duplicate.ok) expect(duplicate.duplicate).toBe(true);
    expect(stocks.p1).toBe(7);
  });

  it('[reconcile] flags ledger vs stock discrepancies', async () => {
    const { inventory, reconciliationRepo } = makeStack({ p1: 10 });
    const result = await inventory.reconcileInventory({ actor: 'system' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.scanned).toBeGreaterThanOrEqual(1);
    expect(result.data.discrepancies.length).toBeGreaterThan(0);
    expect(reconciliationRepo.cases.length).toBeGreaterThan(0);
  });

  it('[cleanup] returns structured partial failure report', async () => {
    const { inventory, reservationRepo } = makeStack({ p1: 1 });
    reservationRepo.reservations.set('expired-1', {
      id: 'expired-1',
      orderId: 'order-expired',
      state: 'reserved',
      lines: [{ productId: 'p1', quantity: 1 }],
      idempotencyKey: 'checkout:expired-1',
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
});
