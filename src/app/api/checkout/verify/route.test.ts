import { beforeEach, describe, expect, it, vi } from 'vitest';
import { OrderNotFoundError, UnauthorizedError } from '@domain/errors';

const verifyPaymentFromClient = vi.fn();
const getPaymentIntent = vi.fn();

vi.mock('@infrastructure/server/services', () => ({
  getServerServices: vi.fn(async () => ({
    checkout: { verifyPaymentFromClient },
    stripeService: { getPaymentIntent },
  })),
}));

vi.mock('@infrastructure/services/StripeService', () => ({
  StripeService: vi.fn(() => ({ getPaymentIntent })),
}));

vi.mock('@infrastructure/server/apiGuards', () => ({
  requireSessionUser: vi.fn(async () => ({ id: 'user-1', email: 'u@example.com', displayName: 'User', role: 'customer', createdAt: new Date() })),
  requireString: (value: string | null) => {
    if (!value) throw new Error('required');
    return value;
  },
  jsonError: (err: any) => {
    const status = err?.name === 'UnauthorizedError' ? 403 : err?.name === 'OrderNotFoundError' ? 404 : 500;
    return Response.json({ error: err?.message || 'error' }, { status });
  },
}));

describe('checkout verify authorization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getPaymentIntent.mockResolvedValue({ id: 'pi_1', status: 'succeeded', metadata: { orderId: 'o1' } });
  });

  it('does not finalize a payment intent owned by another user', async () => {
    verifyPaymentFromClient.mockRejectedValue(new UnauthorizedError());
    const { GET } = await import('./route');

    const response = await GET(new Request('https://example.test/api/checkout/verify?payment_intent=pi_1'));

    expect(response.status).toBe(403);
    expect(verifyPaymentFromClient).toHaveBeenCalledWith('user-1', 'pi_1', {
      id: 'pi_1',
      status: 'succeeded',
      metadata: { orderId: 'o1' },
    });
  });

  it('delegates verification to the centralized checkout flow', async () => {
    verifyPaymentFromClient.mockResolvedValue({ success: true, orderId: 'o1', status: 'processing' });
    const { GET } = await import('./route');

    const response = await GET(new Request('https://example.test/api/checkout/verify?payment_intent=pi_1'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(verifyPaymentFromClient).toHaveBeenCalledWith('user-1', 'pi_1', {
      id: 'pi_1',
      status: 'succeeded',
      metadata: { orderId: 'o1' },
    });
  });

  it('returns not found when checkout resolution fails', async () => {
    verifyPaymentFromClient.mockRejectedValue(new OrderNotFoundError('pi_1'));
    const { GET } = await import('./route');

    const response = await GET(new Request('https://example.test/api/checkout/verify?payment_intent=pi_1'));

    expect(response.status).toBe(404);
  });
});
