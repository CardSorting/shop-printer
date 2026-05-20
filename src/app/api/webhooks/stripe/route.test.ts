import { beforeEach, describe, expect, it, vi } from 'vitest';

const constructEvent = vi.fn();
const tryProcessEvent = vi.fn();
const markEventProcessed = vi.fn();
const markEventFailed = vi.fn();
const deleteEvent = vi.fn();
const finalizeOrderPayment = vi.fn();

vi.mock('next/headers', () => ({
  headers: vi.fn(async () => new Headers({ 'stripe-signature': 'sig' })),
}));

vi.mock('@infrastructure/services/StripeService', () => ({
  StripeService: vi.fn(() => ({
    constructEvent,
    tryProcessEvent,
    markEventProcessed,
    markEventFailed,
    deleteEvent,
  })),
}));

vi.mock('@infrastructure/server/services', () => ({
  getServerServices: vi.fn(async () => ({
    orderService: { finalizeOrderPayment },
    orderRepo: { getByPaymentTransactionId: vi.fn(), getById: vi.fn() },
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
    const { POST } = await import('./route');

    const response = await POST(new Request('https://example.test/api/webhooks/stripe', { method: 'POST', body: '{}' }));
    const body = await response.json();

    expect(body.duplicate).toBe(true);
    expect(finalizeOrderPayment).not.toHaveBeenCalled();
    expect(markEventProcessed).not.toHaveBeenCalled();
  });

  it('marks event as completed after successful processing', async () => {
    tryProcessEvent.mockResolvedValue(false);
    finalizeOrderPayment.mockResolvedValue({});
    markEventProcessed.mockResolvedValue(undefined);
    const { POST } = await import('./route');

    const response = await POST(new Request('https://example.test/api/webhooks/stripe', { method: 'POST', body: '{}' }));
    const body = await response.json();

    expect(body.received).toBe(true);
    expect(finalizeOrderPayment).toHaveBeenCalledWith('pi_1', { id: 'pi_1' });
    expect(markEventProcessed).toHaveBeenCalledWith('evt_1', 'payment_intent.succeeded');
  });

  it('marks event as failed (not deleted) on processing error', async () => {
    tryProcessEvent.mockResolvedValue(false);
    finalizeOrderPayment.mockRejectedValue(new Error('Firestore timeout'));
    markEventFailed.mockResolvedValue(undefined);
    const { POST } = await import('./route');

    const response = await POST(new Request('https://example.test/api/webhooks/stripe', { method: 'POST', body: '{}' }));

    expect(response.status).toBe(500);
    expect(markEventFailed).toHaveBeenCalledWith('evt_1', 'Firestore timeout');
    expect(deleteEvent).not.toHaveBeenCalled();
  });
});
