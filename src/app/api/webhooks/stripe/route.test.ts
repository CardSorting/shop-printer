import { beforeEach, describe, expect, it, vi } from 'vitest';

const constructEvent = vi.fn();
const tryProcessEvent = vi.fn();
const getEventStatus = vi.fn();
const markEventProcessed = vi.fn();
const markEventFailed = vi.fn();
const deleteEvent = vi.fn();
const finalizeOrderPayment = vi.fn();
const updateOrderStatus = vi.fn();
const getByPaymentTransactionId = vi.fn();
const getById = vi.fn();
const getPaymentIntent = vi.fn();

vi.mock('next/headers', () => ({
  headers: vi.fn(async () => new Headers({ 'stripe-signature': 'sig' })),
}));

vi.mock('@infrastructure/services/StripeService', () => ({
  StripeService: vi.fn(() => ({
    constructEvent,
    tryProcessEvent,
    getEventStatus,
    markEventProcessed,
    markEventFailed,
    deleteEvent,
    getPaymentIntent,
  })),
}));

vi.mock('@infrastructure/server/services', () => ({
  getServerServices: vi.fn(async () => ({
    orderService: { finalizeOrderPayment, updateOrderStatus },
    orderRepo: { getByPaymentTransactionId, getById },
  })),
}));

describe('Stripe webhook replay handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    constructEvent.mockReturnValue({
      id: 'evt_1',
      type: 'payment_intent.succeeded',
      data: { object: { id: 'pi_1' } },
    });
  });

  it('does not finalize duplicate webhook events', async () => {
    tryProcessEvent.mockResolvedValue(true);
    getEventStatus.mockResolvedValue('completed');
    const { POST } = await import('./route');

    const response = await POST(new Request('https://example.test/api/webhooks/stripe', { method: 'POST', body: '{}' }));
    const body = await response.json();

    expect(body.duplicate).toBe(true);
    expect(finalizeOrderPayment).not.toHaveBeenCalled();
    expect(markEventProcessed).not.toHaveBeenCalled();
  });

  it('does not acknowledge an in-flight duplicate webhook event', async () => {
    tryProcessEvent.mockResolvedValue(true);
    getEventStatus.mockResolvedValue('processing');
    const { POST } = await import('./route');

    const response = await POST(new Request('https://example.test/api/webhooks/stripe', { method: 'POST', body: '{}' }));
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.retry).toBe(true);
    expect(finalizeOrderPayment).not.toHaveBeenCalled();
    expect(markEventProcessed).not.toHaveBeenCalled();
  });

  it('marks event as completed after successful processing', async () => {
    tryProcessEvent.mockResolvedValue({ alreadyProcessed: false, claimToken: 'claim-token-1' });
    finalizeOrderPayment.mockResolvedValue({});
    markEventProcessed.mockResolvedValue(undefined);
    const { POST } = await import('./route');

    const response = await POST(new Request('https://example.test/api/webhooks/stripe', { method: 'POST', body: '{}' }));
    const body = await response.json();

    expect(body.received).toBe(true);
    expect(finalizeOrderPayment).toHaveBeenCalledWith('pi_1', { id: 'pi_1' });
    expect(markEventProcessed).toHaveBeenCalledWith('evt_1', 'payment_intent.succeeded', 'claim-token-1');
  });

  it('marks event as failed (not deleted) on processing error', async () => {
    tryProcessEvent.mockResolvedValue({ alreadyProcessed: false, claimToken: 'claim-token-failed' });
    finalizeOrderPayment.mockRejectedValue(new Error('Firestore timeout'));
    markEventFailed.mockResolvedValue(undefined);
    const { POST } = await import('./route');

    const response = await POST(new Request('https://example.test/api/webhooks/stripe', { method: 'POST', body: '{}' }));

    expect(response.status).toBe(500);
    expect(markEventFailed).toHaveBeenCalledWith('evt_1', 'Firestore timeout', 'claim-token-failed');
    expect(deleteEvent).not.toHaveBeenCalled();
  });

  it('finalizes instead of cancelling when a payment_failed event is stale and the intent now succeeded', async () => {
    constructEvent.mockReturnValue({
      id: 'evt_failed_stale',
      type: 'payment_intent.payment_failed',
      data: { object: { id: 'pi_1', metadata: { orderId: 'o1' } } },
    });
    tryProcessEvent.mockResolvedValue(false);
    getPaymentIntent.mockResolvedValue({ id: 'pi_1', status: 'succeeded', metadata: { orderId: 'o1' } });
    finalizeOrderPayment.mockResolvedValue({ id: 'o1', status: 'processing' });
    markEventProcessed.mockResolvedValue(undefined);
    const { POST } = await import('./route');

    const response = await POST(new Request('https://example.test/api/webhooks/stripe', { method: 'POST', body: '{}' }));

    expect(response.status).toBe(200);
    expect(finalizeOrderPayment).toHaveBeenCalledWith('pi_1', { id: 'pi_1', status: 'succeeded', metadata: { orderId: 'o1' } });
    expect(updateOrderStatus).not.toHaveBeenCalled();
    expect(markEventProcessed).toHaveBeenCalledWith('evt_failed_stale', 'payment_intent.payment_failed', null);
  });

  it('leaves order unchanged when payment_failed is not in a terminal failed Stripe state', async () => {
    constructEvent.mockReturnValue({
      id: 'evt_failed_processing',
      type: 'payment_intent.payment_failed',
      data: { object: { id: 'pi_1', metadata: { orderId: 'o1' } } },
    });
    tryProcessEvent.mockResolvedValue(false);
    getPaymentIntent.mockResolvedValue({ id: 'pi_1', status: 'processing', metadata: { orderId: 'o1' } });
    markEventProcessed.mockResolvedValue(undefined);
    const { POST } = await import('./route');

    const response = await POST(new Request('https://example.test/api/webhooks/stripe', { method: 'POST', body: '{}' }));

    expect(response.status).toBe(200);
    expect(finalizeOrderPayment).not.toHaveBeenCalled();
    expect(getByPaymentTransactionId).not.toHaveBeenCalled();
    expect(updateOrderStatus).not.toHaveBeenCalled();
  });
});
