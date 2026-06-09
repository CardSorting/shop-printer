import { describe, expect, it, vi, beforeEach } from 'vitest';
import { CheckoutFlowService } from '../core/order/CheckoutFlowService';
import { InMemoryCheckoutEventLog } from './helpers/inMemoryCheckoutEventLog';

function makeFlow(overrides: {
  confirmStripePayment?: ReturnType<typeof vi.fn>;
  handleStripePaymentFailed?: ReturnType<typeof vi.fn>;
  stripe?: Record<string, ReturnType<typeof vi.fn>>;
} = {}) {
  const mutations = {
    runCheckoutReservation: vi.fn(),
    rollbackUnpaidCheckout: vi.fn(),
    confirmStripePayment: overrides.confirmStripePayment ?? vi.fn().mockResolvedValue({ id: 'o1', status: 'processing' }),
  };
  const stripe = {
    constructEvent: vi.fn(),
    tryProcessEvent: vi.fn(),
    getEventStatus: vi.fn(),
    getPaymentIntent: vi.fn(),
    markEventProcessed: vi.fn(),
    markEventFailed: vi.fn(),
    ...overrides.stripe,
  };
  const flow = new CheckoutFlowService(mutations as any, { getById: vi.fn() } as any, {
    stripe: stripe as any,
    eventLog: new InMemoryCheckoutEventLog(),
  });
  if (overrides.handleStripePaymentFailed) {
    vi.spyOn(flow, 'handleStripePaymentFailed').mockImplementation(overrides.handleStripePaymentFailed as any);
  }
  return { flow, stripe, mutations };
}

describe('checkout webhook ingress', () => {
  beforeEach(() => vi.clearAllMocks());

  it('does not finalize duplicate webhook events', async () => {
    const { flow, stripe, mutations } = makeFlow();
    stripe.constructEvent.mockReturnValue({
      id: 'evt_1',
      type: 'payment_intent.succeeded',
      data: { object: { id: 'pi_1' } },
    });
    stripe.tryProcessEvent.mockResolvedValue({ alreadyProcessed: true, claimToken: null });
    stripe.getEventStatus.mockResolvedValue('completed');

    const result = await flow.handleCheckoutWebhook({ rawBody: '{}', signature: 'sig' });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.duplicate).toBe(true);
    expect(mutations.confirmStripePayment).not.toHaveBeenCalled();
    expect(stripe.markEventProcessed).not.toHaveBeenCalled();
  });

  it('does not acknowledge an in-flight duplicate webhook event', async () => {
    const { flow, stripe, mutations } = makeFlow();
    stripe.constructEvent.mockReturnValue({
      id: 'evt_1',
      type: 'payment_intent.succeeded',
      data: { object: { id: 'pi_1' } },
    });
    stripe.tryProcessEvent.mockResolvedValue({ alreadyProcessed: true, claimToken: null });
    stripe.getEventStatus.mockResolvedValue('processing');

    const result = await flow.handleCheckoutWebhook({ rawBody: '{}', signature: 'sig' });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe('WEBHOOK_IN_PROGRESS');
    expect(result.retryable).toBe(true);
    expect(mutations.confirmStripePayment).not.toHaveBeenCalled();
  });

  it('marks event as completed after successful processing', async () => {
    const { flow, stripe, mutations } = makeFlow();
    stripe.constructEvent.mockReturnValue({
      id: 'evt_1',
      type: 'payment_intent.succeeded',
      data: { object: { id: 'pi_1' } },
    });
    stripe.tryProcessEvent.mockResolvedValue({ alreadyProcessed: false, claimToken: 'claim-token-1' });

    const result = await flow.handleCheckoutWebhook({ rawBody: '{}', signature: 'sig' });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.received).toBe(true);
    expect(mutations.confirmStripePayment).toHaveBeenCalledWith('pi_1', { id: 'pi_1' }, 'stripe-webhook');
    expect(stripe.markEventProcessed).toHaveBeenCalledWith('evt_1', 'payment_intent.succeeded', 'claim-token-1');
  });

  it('marks event as failed on processing error', async () => {
    const confirmStripePayment = vi.fn().mockRejectedValue(new Error('Firestore timeout'));
    const { flow, stripe } = makeFlow({ confirmStripePayment });
    stripe.constructEvent.mockReturnValue({
      id: 'evt_1',
      type: 'payment_intent.succeeded',
      data: { object: { id: 'pi_1' } },
    });
    stripe.tryProcessEvent.mockResolvedValue({ alreadyProcessed: false, claimToken: 'claim-token-failed' });

    const result = await flow.handleCheckoutWebhook({ rawBody: '{}', signature: 'sig' });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe('WEBHOOK_PROCESSING_FAILED');
    expect(stripe.markEventFailed).toHaveBeenCalledWith('evt_1', 'Firestore timeout', 'claim-token-failed');
  });

  it('delegates payment_failed events to handleStripePaymentFailed', async () => {
    const handleStripePaymentFailed = vi.fn().mockResolvedValue({ action: 'finalized', orderId: 'o1' });
    const { flow, stripe } = makeFlow({ handleStripePaymentFailed });
    stripe.constructEvent.mockReturnValue({
      id: 'evt_failed_stale',
      type: 'payment_intent.payment_failed',
      data: { object: { id: 'pi_1', metadata: { orderId: 'o1' } } },
    });
    stripe.tryProcessEvent.mockResolvedValue({ alreadyProcessed: false, claimToken: null });
    stripe.getPaymentIntent.mockResolvedValue({ id: 'pi_1', status: 'succeeded', metadata: { orderId: 'o1' } });

    const result = await flow.handleCheckoutWebhook({ rawBody: '{}', signature: 'sig' });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(handleStripePaymentFailed).toHaveBeenCalled();
    expect(stripe.markEventProcessed).toHaveBeenCalledWith('evt_failed_stale', 'payment_intent.payment_failed', null);
  });
});
