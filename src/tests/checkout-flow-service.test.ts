import { describe, expect, it, vi } from 'vitest';
import { CheckoutFlowService } from '../core/order/CheckoutFlowService';
import * as paymentIntentFlow from '../core/order/checkoutPaymentIntentFlow';

function makeOrderRepo() {
  return {
    updatePaymentTransactionId: vi.fn().mockResolvedValue(undefined),
    updateCheckoutAttempt: vi.fn().mockResolvedValue(undefined),
    transitionCheckoutAttemptPhase: vi.fn().mockResolvedValue(undefined),
    updateMetadata: vi.fn().mockResolvedValue(undefined),
    createOrUpdateReconciliationCase: vi.fn().mockResolvedValue(undefined),
  };
}

function makeMutations(overrides: Record<string, any> = {}) {
  return {
    runCheckoutReservation: vi.fn().mockResolvedValue({
      id: 'order-1',
      userId: 'user-1',
      status: 'pending',
      total: 50_000,
      paymentTransactionId: null,
      metadata: {},
    }),
    rollbackUnpaidCheckout: vi.fn().mockResolvedValue(undefined),
    confirmStripePayment: vi.fn(),
    ...overrides,
  };
}

function makeFlow(mutations = makeMutations(), orderRepo = makeOrderRepo()) {
  return new CheckoutFlowService(mutations as any, orderRepo as any);
}

describe('CheckoutFlowService', () => {
  it('reserveCheckout delegates reservation to the checkout service', async () => {
    const mutations = makeMutations();
    const flow = makeFlow(mutations);

    await flow.reserveCheckout({
      userId: 'user-1',
      shippingAddress: { street: '1 Main', city: 'Denver', state: 'CO', zip: '80202', country: 'US' },
      idempotencyKey: 'checkout:reserve',
    });

    expect(mutations.runCheckoutReservation).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        idempotencyKey: 'checkout:reserve',
      }),
    );
  });

  it('runs initiate then payment intent preparation for standard checkouts', async () => {
    const mutations = makeMutations();
    const flow = makeFlow(mutations);
    const createPi = vi.spyOn(paymentIntentFlow, 'createOrResumeClientPaymentIntent').mockResolvedValue({
      clientSecret: 'secret',
      paymentIntentId: 'pi_1',
      orderId: 'order-1',
      amount: 50_000,
    });

    const result = await flow.startClientCheckout({
      userId: 'user-1',
      shippingAddress: { street: '1 Main', city: 'Denver', state: 'CO', zip: '80202', country: 'US' },
      idempotencyKey: 'checkout:test',
      stripe: { createPaymentIntent: vi.fn(), getPaymentIntent: vi.fn(), cancelPaymentIntent: vi.fn() },
    });

    expect(mutations.runCheckoutReservation).toHaveBeenCalled();
    expect(createPi).toHaveBeenCalled();
    expect(result.paymentIntentId).toBe('pi_1');
    createPi.mockRestore();
  });

  it('rolls back and rethrows when high-value step-up fails', async () => {
    const mutations = makeMutations({
      runCheckoutReservation: vi.fn().mockResolvedValue({
        id: 'order-hv',
        userId: 'user-1',
        status: 'pending',
        total: CheckoutFlowService.HIGH_VALUE_THRESHOLD_CENTS,
        paymentTransactionId: null,
        metadata: {},
      }),
    });
    const flow = makeFlow(mutations);
    const stepUpError = new Error('step-up required');

    await expect(flow.startClientCheckout({
      userId: 'user-1',
      shippingAddress: { street: '1 Main', city: 'Denver', state: 'CO', zip: '80202', country: 'US' },
      idempotencyKey: 'checkout:hv',
      stripe: { createPaymentIntent: vi.fn(), getPaymentIntent: vi.fn(), cancelPaymentIntent: vi.fn() },
      requireHighValueStepUp: vi.fn().mockRejectedValue(stepUpError),
    })).rejects.toThrow('step-up required');

    expect(mutations.rollbackUnpaidCheckout).toHaveBeenCalledWith(
      'order-hv',
      'checkout:hv',
      null,
      'high_value_step_up_failure'
    );
  });

  it('finalizes stale payment_failed webhooks when Stripe already succeeded', async () => {
    const mutations = makeMutations({
      confirmStripePayment: vi.fn().mockResolvedValue({ id: 'order-1', status: 'processing' }),
    });
    const flow = makeFlow(mutations);

    const result = await flow.handleStripePaymentFailed({
      paymentIntent: { id: 'pi_1', status: 'requires_payment_method', metadata: { orderId: 'order-1' } },
      currentPaymentIntent: { id: 'pi_1', status: 'succeeded', metadata: { orderId: 'order-1' } },
    });

    expect(result).toEqual({ action: 'finalized', orderId: 'order-1' });
    expect(mutations.confirmStripePayment).toHaveBeenCalled();
  });
});
