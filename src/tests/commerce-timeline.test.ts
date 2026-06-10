import { describe, expect, it } from 'vitest';
import { CommerceEventBus } from '@core/commerce/commerceEventBus';
import { CommerceTimelineService } from '@core/commerce/commerceTimelineService';
import { mapCheckoutEventToEnvelope, mapRefundEventToEnvelope } from '@core/commerce/commerceEventMappers';
import { InMemoryCommerceEventStore } from './helpers/inMemoryCommerceEventStore';

describe('commerce timeline reconstruction', () => {
  it('reconstructs order timeline from unified event stream', async () => {
    const store = new InMemoryCommerceEventStore();
    const bus = new CommerceEventBus(store);
    const timeline = new CommerceTimelineService(store);

    await bus.publish(mapCheckoutEventToEnvelope({
      id: 'e1',
      type: 'checkout.session_created',
      orderId: 'order-1',
      occurredAt: '2026-01-01T10:00:00.000Z',
    }));
    await bus.publish(mapCheckoutEventToEnvelope({
      id: 'e2',
      type: 'checkout.payment_confirmed',
      orderId: 'order-1',
      occurredAt: '2026-01-01T10:05:00.000Z',
      payload: { paymentState: 'paid' },
    }));
    await bus.publish(mapRefundEventToEnvelope({
      id: 'e3',
      idempotencyKey: 'refund-key',
      orderId: 'order-1',
      amount: 500,
      actorId: 'admin-1',
      actorEmail: 'admin@test.com',
      createdAt: '2026-01-01T11:00:00.000Z',
    }));

    const entries = await timeline.getOrderTimeline('order-1');
    expect(entries.map((entry) => entry.type)).toEqual([
      'checkout.session_created',
      'checkout.payment_confirmed',
      'refund.created',
    ]);
    expect(entries[0].label).toBe('Checkout created');
    expect(entries[2].label).toBe('Refund completed');
  });
});
