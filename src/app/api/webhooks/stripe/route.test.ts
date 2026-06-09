import { beforeEach, describe, expect, it, vi } from 'vitest';

const handleCheckoutWebhook = vi.fn();

vi.mock('next/headers', () => ({
  headers: vi.fn(async () => new Headers({ 'stripe-signature': 'sig' })),
}));

vi.mock('@infrastructure/server/services', () => ({
  getServerServices: vi.fn(async () => ({
    checkout: { handleCheckoutWebhook },
  })),
}));

describe('Stripe webhook route boundary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('delegates webhook processing to services.checkout', async () => {
    handleCheckoutWebhook.mockResolvedValue({
      ok: true,
      data: { httpStatus: 200, received: true },
    });
    const { POST } = await import('./route');

    const response = await POST(new Request('https://example.test/api/webhooks/stripe', { method: 'POST', body: '{}' }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.received).toBe(true);
    expect(handleCheckoutWebhook).toHaveBeenCalledWith({ rawBody: '{}', signature: 'sig' });
  });

  it('returns duplicate acknowledgement from checkout ingress', async () => {
    handleCheckoutWebhook.mockResolvedValue({
      ok: true,
      data: { httpStatus: 200, received: true, duplicate: true },
      duplicate: true,
    });
    const { POST } = await import('./route');

    const response = await POST(new Request('https://example.test/api/webhooks/stripe', { method: 'POST', body: '{}' }));
    const body = await response.json();

    expect(body.duplicate).toBe(true);
  });
});
