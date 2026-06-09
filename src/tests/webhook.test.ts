import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../app/api/webhooks/stripe/route';
import { getServerServices } from '@infrastructure/server/services';

const { handleCheckoutWebhook } = vi.hoisted(() => ({
  handleCheckoutWebhook: vi.fn(),
}));

vi.mock('@infrastructure/server/services', () => ({
  getServerServices: vi.fn().mockResolvedValue({
    checkout: { handleCheckoutWebhook },
  }),
}));

vi.mock('next/headers', () => ({
  headers: vi.fn().mockResolvedValue({
    get: vi.fn().mockReturnValue('mock_sig'),
  }),
}));

describe('Stripe Webhook Route - Reservation with Rollback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should process webhook event successfully if not already processed', async () => {
    handleCheckoutWebhook.mockResolvedValueOnce({
      ok: true,
      data: { httpStatus: 200, received: true },
    });

    const request = new Request('http://localhost/api/webhooks/stripe', {
      method: 'POST',
      body: 'payload',
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.received).toBe(true);
    expect(handleCheckoutWebhook).toHaveBeenCalledWith({
      rawBody: 'payload',
      signature: 'mock_sig',
    });
  });

  it('should skip processing and return received: true if event is already completed', async () => {
    handleCheckoutWebhook.mockResolvedValueOnce({
      ok: true,
      data: { httpStatus: 200, received: true, duplicate: true },
      duplicate: true,
    });

    const request = new Request('http://localhost/api/webhooks/stripe', {
      method: 'POST',
      body: 'payload',
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.duplicate).toBe(true);
  });

  it('should return 503 when event is already being processed', async () => {
    handleCheckoutWebhook.mockResolvedValueOnce({
      ok: false,
      code: 'WEBHOOK_IN_PROGRESS',
      message: 'Webhook event is already being processed',
      retryable: true,
    });

    const request = new Request('http://localhost/api/webhooks/stripe', {
      method: 'POST',
      body: 'payload',
    });

    const response = await POST(request);

    expect(response.status).toBe(503);
  });

  it('should return 500 when checkout webhook processing fails', async () => {
    handleCheckoutWebhook.mockResolvedValueOnce({
      ok: false,
      code: 'WEBHOOK_PROCESSING_FAILED',
      message: 'Internal server error processing webhook',
      retryable: true,
    });

    const request = new Request('http://localhost/api/webhooks/stripe', {
      method: 'POST',
      body: 'payload',
    });

    const response = await POST(request);
    expect(response.status).toBe(500);
  });
});
