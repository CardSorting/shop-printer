import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CommerceEventBus } from '@core/commerce/commerceEventBus';
import { CommerceTimelineService } from '@core/commerce/commerceTimelineService';
import { mapCheckoutEventToEnvelope } from '@core/commerce/commerceEventMappers';
import { runWithPostCommitCommerceEvents } from '@core/commerce/postCommitCommerceEvents';
import { createInventoryStack } from '@core/inventory/createInventoryStack';
import {
  InMemoryInventoryLedgerRepository,
  InMemoryInventoryReconciliationRepository,
  InMemoryInventoryReservationRepository,
} from './helpers/inMemoryInventoryStores';
import { InMemoryCommerceEventStore } from './helpers/inMemoryCommerceEventStore';

function makeStack(stockByProduct: Record<string, number> = { p1: 10 }, store: InMemoryCommerceEventStore) {
  const stocks = { ...stockByProduct };
  const productRepo = {
    getById: vi.fn(async (id: string) => {
      if (!(id in stocks)) return null;
      return { id, stock: stocks[id] ?? 0, variants: [] };
    }),
    getAll: vi.fn(async () => ({ products: Object.keys(stocks).map((id) => ({ id, stock: stocks[id] })) })),
    batchUpdateStock: vi.fn(async (updates: Array<{ id: string; delta: number }>) => {
      for (const update of updates) {
        stocks[update.id] = (stocks[update.id] ?? 0) + update.delta;
      }
    }),
  };

  const bus = new CommerceEventBus(store);
  const stack = createInventoryStack({
    productRepo: productRepo as any,
    ledgerRepo: new InMemoryInventoryLedgerRepository(),
    reservationRepo: new InMemoryInventoryReservationRepository(),
    reconciliationRepo: new InMemoryInventoryReconciliationRepository(),
    commerceEventBus: bus,
  });

  return { ...stack, productRepo, stocks, store, bus };
}

async function inTransaction<T>(fn: (transaction: object) => Promise<T>): Promise<T> {
  return fn({});
}

describe('Post-commit inventory commerce event fan-out', () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => vi.useRealTimers());

  it('[failed transaction] publishes zero commerce events', async () => {
    const store = new InMemoryCommerceEventStore();
    const { inventory, bus } = makeStack({ p1: 5 }, store);

    await expect(
      runWithPostCommitCommerceEvents(bus, async () => {
        await inTransaction(async (transaction) => {
          await inventory.reserveInventory({
            orderId: 'order-fail',
            items: [{ productId: 'p1', quantity: 1 }],
            idempotencyKey: 'attempt-fail',
            actor: 'checkout',
            transaction,
          });
          throw new Error('Firestore transaction aborted');
        });
      }),
    ).rejects.toThrow('Firestore transaction aborted');

    expect(store.events).toHaveLength(0);
  });

  it('[successful reserve] publishes inventory.reserved after commit', async () => {
    const store = new InMemoryCommerceEventStore();
    const { inventory, bus } = makeStack({ p1: 5 }, store);

    await runWithPostCommitCommerceEvents(bus, () =>
      inTransaction((transaction) =>
        inventory.reserveInventory({
          orderId: 'order-reserve',
          items: [{ productId: 'p1', quantity: 2 }],
          idempotencyKey: 'attempt-reserve',
          actor: 'checkout',
          transaction,
        }),
      ),
    );

    expect(store.events.some((event) => event.type === 'inventory.reserved')).toBe(true);
    expect(store.events.every((event) => event.relatedOrderId === 'order-reserve')).toBe(true);
  });

  it('[successful confirm] publishes inventory.committed after commit', async () => {
    const store = new InMemoryCommerceEventStore();
    const { inventory, bus } = makeStack({ p1: 5 }, store);
    const orderId = 'order-confirm';
    const attemptId = 'attempt-confirm';

    await runWithPostCommitCommerceEvents(bus, () =>
      inTransaction((transaction) =>
        inventory.reserveInventory({
          orderId,
          items: [{ productId: 'p1', quantity: 1 }],
          idempotencyKey: attemptId,
          actor: 'checkout',
          transaction,
        }),
      ),
    );

    await runWithPostCommitCommerceEvents(bus, () =>
      inTransaction((transaction) =>
        inventory.confirmReservation({
          orderId,
          idempotencyKey: `confirm:pi_confirm`,
          actor: 'checkout',
          transaction,
        }),
      ),
    );

    expect(store.events.some((event) => event.type === 'inventory.committed')).toBe(true);
  });

  it('[successful release] publishes inventory.released after commit', async () => {
    const store = new InMemoryCommerceEventStore();
    const { inventory, bus } = makeStack({ p1: 5 }, store);
    const orderId = 'order-release';
    const attemptId = 'attempt-release';

    await runWithPostCommitCommerceEvents(bus, () =>
      inTransaction((transaction) =>
        inventory.reserveInventory({
          orderId,
          items: [{ productId: 'p1', quantity: 1 }],
          idempotencyKey: attemptId,
          actor: 'checkout',
          transaction,
        }),
      ),
    );

    await runWithPostCommitCommerceEvents(bus, () =>
      inTransaction((transaction) =>
        inventory.releaseReservation({
          orderId,
          idempotencyKey: `release:${attemptId}`,
          actor: 'checkout',
          reason: 'checkout_cancelled',
          transaction,
        }),
      ),
    );

    expect(store.events.some((event) => event.type === 'inventory.released')).toBe(true);
  });

  it('[duplicate inventory operation] does not duplicate commerce event', async () => {
    const store = new InMemoryCommerceEventStore();
    const { inventory, bus } = makeStack({ p1: 5 }, store);
    const orderId = 'order-dup';
    const attemptId = 'attempt-dup';

    const reserve = () =>
      runWithPostCommitCommerceEvents(bus, () =>
        inTransaction((transaction) =>
          inventory.reserveInventory({
            orderId,
            items: [{ productId: 'p1', quantity: 1 }],
            idempotencyKey: attemptId,
            actor: 'checkout',
            transaction,
          }),
        ),
      );

    await reserve();
    await reserve();

    const reservedEvents = store.events.filter((event) => event.type === 'inventory.reserved');
    expect(reservedEvents).toHaveLength(1);
  });

  it('[order timeline] shows checkout + inventory + payment in chronological order', async () => {
    vi.useFakeTimers();
    const store = new InMemoryCommerceEventStore();
    const { inventory, bus } = makeStack({ p1: 5 }, store);
    const timeline = new CommerceTimelineService(store);
    const orderId = 'order-timeline';
    const attemptId = 'attempt-timeline';
    const paymentIntentId = 'pi_timeline';

    vi.setSystemTime(new Date('2026-01-01T10:00:00.000Z'));
    await bus.publish(mapCheckoutEventToEnvelope({
      id: 'checkout-session',
      type: 'checkout.session_created',
      orderId,
      occurredAt: '2026-01-01T10:00:00.000Z',
      idempotencyKey: attemptId,
    }));

    vi.setSystemTime(new Date('2026-01-01T10:02:00.000Z'));
    await runWithPostCommitCommerceEvents(bus, () =>
      inTransaction((transaction) =>
        inventory.reserveInventory({
          orderId,
          items: [{ productId: 'p1', quantity: 1 }],
          idempotencyKey: attemptId,
          actor: 'checkout',
          transaction,
        }),
      ),
    );

    vi.setSystemTime(new Date('2026-01-01T10:05:00.000Z'));
    await bus.publish(mapCheckoutEventToEnvelope({
      id: 'checkout-payment',
      type: 'checkout.payment_confirmed',
      orderId,
      occurredAt: '2026-01-01T10:05:00.000Z',
      idempotencyKey: paymentIntentId,
      payload: { paymentState: 'paid' },
    }));

    vi.setSystemTime(new Date('2026-01-01T10:07:00.000Z'));
    await runWithPostCommitCommerceEvents(bus, () =>
      inTransaction((transaction) =>
        inventory.confirmReservation({
          orderId,
          idempotencyKey: `confirm:${paymentIntentId}`,
          actor: 'checkout',
          transaction,
        }),
      ),
    );

    const entries = await timeline.getOrderTimeline(orderId);
    const types = entries.map((entry) => entry.type);

    expect(types).toEqual([
      'checkout.session_created',
      'inventory.reserved',
      'checkout.payment_confirmed',
      'inventory.committed',
    ]);

    const timestamps = entries.map((entry) => new Date(entry.occurredAt).getTime());
    expect(timestamps).toEqual([...timestamps].sort((a, b) => a - b));
  });
});
