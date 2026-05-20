import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../app/api/webhooks/stripe/route';
import { StripeService } from '@infrastructure/services/StripeService';
import { getServerServices } from '@infrastructure/server/services';

vi.mock('@infrastructure/services/StripeService', () => {
  const mockStripeService = {
    constructEvent: vi.fn(),
    tryProcessEvent: vi.fn(),
    getEventStatus: vi.fn(),
    getPaymentIntent: vi.fn(),
    deleteEvent: vi.fn(),
    isEventProcessed: vi.fn(),
    markEventProcessed: vi.fn(),
    markEventFailed: vi.fn(),
  };
  return {
    StripeService: vi.fn().mockImplementation(() => mockStripeService),
  };
});

vi.mock('@infrastructure/server/services', () => {
  const mockServices = {
    orderService: {
      finalizeOrderPayment: vi.fn(),
      updateOrderStatus: vi.fn(),
    },
    orderRepo: {
      getByPaymentTransactionId: vi.fn(),
      getById: vi.fn(),
    },
  };
  return {
    getServerServices: vi.fn().mockResolvedValue(mockServices),
  };
});

vi.mock('next/headers', () => ({
  headers: vi.fn().mockResolvedValue({
    get: vi.fn().mockReturnValue('mock_sig'),
  }),
}));

describe('Stripe Webhook Route - Reservation with Rollback', () => {
  let mockStripe: any;
  let mockOrderService: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    
    // Retrieve references to our mocked instances
    const stripeService = new StripeService();
    mockStripe = stripeService;
    
    const services = await getServerServices();
    mockOrderService = services.orderService;
    
    // Default constructEvent mockup returns a payment_intent.succeeded event
    mockStripe.constructEvent.mockReturnValue({
      id: 'evt_123',
      type: 'payment_intent.succeeded',
      data: {
        object: { id: 'pi_123' },
      },
    });
  });

  it('should process webhook event successfully if not already processed', async () => {
    mockStripe.tryProcessEvent.mockResolvedValueOnce(false); // not yet processed, lock acquired
    mockOrderService.finalizeOrderPayment.mockResolvedValueOnce({});

    const request = new Request('http://localhost/api/webhooks/stripe', {
      method: 'POST',
      body: 'payload',
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.received).toBe(true);
    expect(mockStripe.tryProcessEvent).toHaveBeenCalledWith('evt_123', 'payment_intent.succeeded');
    expect(mockOrderService.finalizeOrderPayment).toHaveBeenCalledWith('pi_123', expect.anything());
    expect(mockStripe.deleteEvent).not.toHaveBeenCalled();
  });

  it('should skip processing and return received: true if event is already completed', async () => {
    mockStripe.tryProcessEvent.mockResolvedValueOnce(true); // already locked / processed
    mockStripe.getEventStatus.mockResolvedValueOnce('completed');

    const request = new Request('http://localhost/api/webhooks/stripe', {
      method: 'POST',
      body: 'payload',
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.duplicate).toBe(true);
    expect(mockStripe.tryProcessEvent).toHaveBeenCalledWith('evt_123', 'payment_intent.succeeded');
    expect(mockOrderService.finalizeOrderPayment).not.toHaveBeenCalled();
    expect(mockStripe.deleteEvent).not.toHaveBeenCalled();
  });

  it('should return 503 for duplicate delivery while original event is still processing', async () => {
    mockStripe.tryProcessEvent.mockResolvedValueOnce(true);
    mockStripe.getEventStatus.mockResolvedValueOnce('processing');

    const request = new Request('http://localhost/api/webhooks/stripe', {
      method: 'POST',
      body: 'payload',
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(503);
    expect(data.retry).toBe(true);
    expect(mockOrderService.finalizeOrderPayment).not.toHaveBeenCalled();
    expect(mockStripe.deleteEvent).not.toHaveBeenCalled();
  });

  it('should mark event failed and return 500 if processing throws an error', async () => {
    mockStripe.tryProcessEvent.mockResolvedValueOnce(false); // reserve succeeds
    mockOrderService.finalizeOrderPayment.mockRejectedValueOnce(new Error('Database error during finalization'));
    mockStripe.markEventFailed.mockResolvedValueOnce(undefined);

    const request = new Request('http://localhost/api/webhooks/stripe', {
      method: 'POST',
      body: 'payload',
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Internal server error processing webhook');
    
    // Assert retryable failure state was recorded
    expect(mockStripe.markEventFailed).toHaveBeenCalledWith('evt_123', 'Database error during finalization', null);
    expect(mockStripe.deleteEvent).not.toHaveBeenCalled();
  });
});
