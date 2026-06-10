import fs from 'node:fs';
import path from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createInventoryStack } from '@core/inventory/createInventoryStack';
import {
  InMemoryInventoryLedgerRepository,
  InMemoryInventoryReconciliationRepository,
  InMemoryInventoryReservationRepository,
} from './helpers/inMemoryInventoryStores';

function read(relativePath: string): string {
  return fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');
}

function makeStack(stockByProduct: Record<string, number> = { p1: 10 }) {
  const stocks = { ...stockByProduct };
  const productRepo = {
    getById: vi.fn(async (id: string) => ({
      id,
      stock: stocks[id] ?? 0,
      variants: [],
    })),
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

describe('Inventory reservation proof (scarcity authority)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('[cart] uses checkAvailability only — never reserves stock', () => {
    const cartService = read('src/core/CartService.ts');
    const cartFlow = read('src/core/cart/cartFlowService.ts');
    const cartValidation = read('src/core/cart/cartValidationService.ts');
    expect(cartService).toMatch(/checkAvailability/);
    expect(cartService).not.toMatch(/reserveInventory/);
    expect(cartFlow).not.toMatch(/reserveInventory/);
    expect(cartValidation).not.toMatch(/reserveInventory/);
  });

  it('[checkout] reserves physical items inside transaction with bounded TTL', () => {
    const checkout = read('src/core/order/checkoutMutationService.ts');
    expect(checkout).toMatch(/physicalItems\.length > 0/);
    expect(checkout).toMatch(/reserveInventory\(\{/);
    expect(checkout).toMatch(/transaction,/);
    expect(checkout).toMatch(/RESERVATION_TTL_MS/);
    expect(checkout).toMatch(/expiresAt: reservationExpiresAt/);
  });

  it('[checkout] confirms reservation on payment finalize', () => {
    const checkout = read('src/core/order/checkoutMutationService.ts');
    expect(checkout).toMatch(/confirmReservation\(\{/);
    expect(checkout).toMatch(/Cannot finalize physical order without an inventory reservation/);
    expect(checkout).toMatch(/inventoryReservationFinalized/);
  });

  it('[checkout] releases reservation on rollback when still held', () => {
    const checkout = read('src/core/order/checkoutMutationService.ts');
    expect(checkout).toMatch(/releaseReservation\(\{/);
    expect(checkout).toMatch(/inventoryReservationReleased/);
    expect(checkout).toMatch(/checkout_cancelled/);
  });

  it('[system] cleanup jobs delegate to services.inventory.cleanupExpiredReservations', () => {
    const inventoryCleanup = read('src/app/api/system/cleanup-inventory/route.ts');
    const ordersCleanup = read('src/app/api/system/cleanup-orders/route.ts');
    expect(inventoryCleanup).toMatch(/services\.inventory\.cleanupExpiredReservations/);
    expect(ordersCleanup).toMatch(/services\.inventory\.cleanupExpiredReservations/);
    expect(inventoryCleanup).not.toMatch(/releaseReservation\(/);
  });

  it('[events] cart UX events stay separate from inventory commerce timeline', () => {
    const cartEvents = read('src/core/cart/cartEvents.ts');
    expect(cartEvents).not.toMatch(/inventory\.reserved/);
    expect(cartEvents).not.toMatch(/commerceEventBus/);
    const mappers = read('src/core/commerce/commerceEventMappers.ts');
    expect(mappers).toMatch(/inventory\.reserved/);
  });

  it('[lifecycle] cannot release a committed reservation', async () => {
    const { inventory } = makeStack({ p1: 5 });
    await inventory.reserveInventory({
      orderId: 'order-committed',
      items: [{ productId: 'p1', quantity: 1 }],
      idempotencyKey: 'checkout:committed',
      actor: 'checkout',
    });
    const confirm = await inventory.confirmReservation({
      orderId: 'order-committed',
      idempotencyKey: 'confirm:pi_committed',
      actor: 'checkout',
    });
    expect(confirm.ok).toBe(true);

    const release = await inventory.releaseReservation({
      orderId: 'order-committed',
      idempotencyKey: 'release:attempt-committed',
      actor: 'checkout',
      reason: 'payment_failed',
    });
    expect(release.ok).toBe(false);
    if (release.ok) return;
    expect(release.code).toBe('RESERVATION_INVALID_STATE');
  });

  it('[lifecycle] cannot confirm after release restores stock', async () => {
    const { inventory, stocks } = makeStack({ p1: 4 });
    await inventory.reserveInventory({
      orderId: 'order-released',
      items: [{ productId: 'p1', quantity: 2 }],
      idempotencyKey: 'checkout:released',
      actor: 'checkout',
    });
    expect(stocks.p1).toBe(2);

    const release = await inventory.releaseReservation({
      orderId: 'order-released',
      idempotencyKey: 'release:attempt-released',
      actor: 'checkout',
      reason: 'payment_failed',
    });
    expect(release.ok).toBe(true);
    expect(stocks.p1).toBe(4);

    const confirm = await inventory.confirmReservation({
      orderId: 'order-released',
      idempotencyKey: 'confirm:pi_released',
      actor: 'checkout',
    });
    expect(confirm.ok).toBe(false);
    if (confirm.ok) return;
    expect(confirm.code).toBe('RESERVATION_INVALID_STATE');
  });

  it('[competition] second reserve fails when first hold exhausts stock', async () => {
    const { inventory } = makeStack({ p1: 2 });
    const first = await inventory.reserveInventory({
      orderId: 'order-a',
      items: [{ productId: 'p1', quantity: 2 }],
      idempotencyKey: 'checkout:order-a',
      actor: 'checkout',
    });
    expect(first.ok).toBe(true);

    const second = await inventory.reserveInventory({
      orderId: 'order-b',
      items: [{ productId: 'p1', quantity: 1 }],
      idempotencyKey: 'checkout:order-b',
      actor: 'checkout',
    });
    expect(second.ok).toBe(false);
    if (second.ok) return;
    expect(second.code).toBe('INSUFFICIENT_STOCK');
  });

  it('[expiry] cleanup restores stock for expired reservations', async () => {
    const { inventory, stocks, reservationRepo } = makeStack({ p1: 3 });
    await inventory.reserveInventory({
      orderId: 'order-expired',
      items: [{ productId: 'p1', quantity: 2 }],
      idempotencyKey: 'checkout:expired-live',
      actor: 'checkout',
    });
    expect(stocks.p1).toBe(1);

    const reservation = [...reservationRepo.reservations.values()].find((r) => r.orderId === 'order-expired');
    expect(reservation).toBeDefined();
    if (!reservation) return;
    reservation.expiresAt = new Date(Date.now() - 60_000).toISOString();
    reservationRepo.reservations.set(reservation.id, reservation);

    const cleanup = await inventory.cleanupExpiredReservations({ limit: 10 });
    expect(cleanup.ok).toBe(true);
    if (!cleanup.ok) return;
    expect(cleanup.data.released).toBeGreaterThanOrEqual(1);
    expect(stocks.p1).toBe(3);
  });
});
