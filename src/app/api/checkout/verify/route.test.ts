import { beforeEach, describe, expect, it, vi } from 'vitest';

const recoverPendingOrder = vi.fn();

vi.mock('@infrastructure/server/services', () => ({
  getServerServices: vi.fn(async () => ({
    checkout: { recoverPendingOrder },
  })),
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
  });

  it('does not finalize a payment intent owned by another user', async () => {
    recoverPendingOrder.mockResolvedValue({
      ok: false,
      code: 'VERIFICATION_FAILED',
      message: 'Unauthorized',
      retryable: false,
    });
    const { GET } = await import('./route');

    const response = await GET(new Request('https://example.test/api/checkout/verify?payment_intent=pi_1'));

    expect(response.status).toBe(400);
    expect(recoverPendingOrder).toHaveBeenCalledWith({
      userId: 'user-1',
      paymentIntentId: 'pi_1',
    });
  });

  it('delegates verification to the centralized checkout flow', async () => {
    recoverPendingOrder.mockResolvedValue({
      ok: true,
      data: { success: true, orderId: 'o1', status: 'processing' },
    });
    const { GET } = await import('./route');

    const response = await GET(new Request('https://example.test/api/checkout/verify?payment_intent=pi_1'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(recoverPendingOrder).toHaveBeenCalledWith({
      userId: 'user-1',
      paymentIntentId: 'pi_1',
    });
  });

  it('returns verification failure when checkout resolution fails', async () => {
    recoverPendingOrder.mockResolvedValue({
      ok: false,
      code: 'RECOVERY_FAILED',
      message: 'Order not found',
      retryable: false,
    });
    const { GET } = await import('./route');

    const response = await GET(new Request('https://example.test/api/checkout/verify?payment_intent=pi_1'));

    expect(response.status).toBe(400);
  });
});
