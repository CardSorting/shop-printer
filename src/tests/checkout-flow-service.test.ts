import { describe, expect, it, vi } from 'vitest';
import { CheckoutFlowService } from '../core/order/CheckoutFlowService';
import * as paymentIntentFlow from '../core/order/checkoutPaymentIntentFlow';
import { InMemoryCheckoutEventLog } from './helpers/inMemoryCheckoutEventLog';

function makeOrderRepo(overrides: Record<string, any> = {}) {
  return {
    getAll: vi.fn().mockResolvedValue({ orders: [] }),
    getById: vi.fn().mockResolvedValue({ id: 'order-1', metadata: {} }),
    getReconciliationCase: vi.fn(),
    updatePaymentTransactionId: vi.fn().mockResolvedValue(undefined),
    updateCheckoutAttempt: vi.fn().mockResolvedValue(undefined),
    transitionCheckoutAttemptPhase: vi.fn().mockResolvedValue(undefined),
    updateMetadata: vi.fn().mockResolvedValue(undefined),
    createOrUpdateReconciliationCase: vi.fn().mockResolvedValue(undefined),
    ...overrides,
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

function makeFlow(
  mutations = makeMutations(),
  orderRepo = makeOrderRepo(),
  options: {
    cancelExpiredPendingOrder?: (orderId: string) => Promise<void>;
    stripe?: any;
    eventLog?: InMemoryCheckoutEventLog;
    recordOperatorAction?: ReturnType<typeof vi.fn>;
  } = {},
) {
  return new CheckoutFlowService(mutations as any, orderRepo as any, {
    cancelExpiredPendingOrder: options.cancelExpiredPendingOrder ?? vi.fn().mockResolvedValue(undefined),
    stripe: options.stripe,
    eventLog: options.eventLog ?? new InMemoryCheckoutEventLog(),
    recordOperatorAction: options.recordOperatorAction ?? vi.fn().mockResolvedValue(undefined),
  });
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

  it('cleanupExpiredPendingOrders finalizes succeeded Stripe payments instead of cancelling', async () => {
    const order = {
      id: 'order-cleanup',
      userId: 'user-1',
      status: 'pending',
      paymentTransactionId: 'pi_cleanup',
      idempotencyKey: 'checkout-cleanup',
      metadata: {},
    };
    const orderRepo = makeOrderRepo({
      getAll: vi.fn().mockResolvedValue({ orders: [order] }),
      getById: vi.fn().mockResolvedValue(order),
    });
    const mutations = makeMutations({
      confirmStripePayment: vi.fn().mockResolvedValue({ id: 'order-cleanup', status: 'processing' }),
    });
    const cancelExpiredOrder = vi.fn();
    const stripe = { getPaymentIntent: vi.fn().mockResolvedValue({ id: 'pi_cleanup', status: 'succeeded' }) };
    const flow = makeFlow(mutations, orderRepo, { cancelExpiredPendingOrder: cancelExpiredOrder, stripe });

    const result = await flow.cleanupExpiredPendingOrders({ maxAgeMinutes: 60 });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.scanned).toBe(1);
    expect(result.data.cancelled).toBe(0);
    expect(mutations.confirmStripePayment).toHaveBeenCalledWith('pi_cleanup', expect.anything(), 'system');
    expect(cancelExpiredOrder).not.toHaveBeenCalled();
  });

  it('completeOperatorRetryRecovery finalizes paid-not-finalized cases', async () => {
    const orderRepo = makeOrderRepo({
      getReconciliationCase: vi.fn().mockResolvedValue({
        paymentIntentId: 'pi_retry',
        reason: 'paid_not_finalized',
        severity: 'high',
        operatorVisibleMessage: 'needs recovery',
        evidence: [],
      }),
    });
    const mutations = makeMutations({
      confirmStripePayment: vi.fn().mockResolvedValue({ id: 'order-retry', status: 'processing' }),
    });
    const flow = makeFlow(mutations, orderRepo);
    const markCaseResolved = vi.fn().mockResolvedValue(undefined);

    await flow.completeOperatorRetryRecovery({
      caseId: 'pi_retry_paid_not_finalized',
      reason: 'operator retry',
      actor: { id: 'admin-1', email: 'admin@test.com' },
      markCaseResolved,
    });

    expect(mutations.confirmStripePayment).toHaveBeenCalledWith('pi_retry', undefined, 'admin@test.com');
    expect(markCaseResolved).toHaveBeenCalledWith({
      caseId: 'pi_retry_paid_not_finalized',
      reason: 'Automated recovery retry completed successfully: operator retry',
      actor: { id: 'admin-1', email: 'admin@test.com' },
    });
  });

  it('handleReconciliationOperatorAction records action then runs retry recovery', async () => {
    const orderRepo = makeOrderRepo({
      getReconciliationCase: vi.fn().mockResolvedValue({
        paymentIntentId: 'pi_route',
        reason: 'paid_not_finalized',
        severity: 'high',
        operatorVisibleMessage: 'needs recovery',
        evidence: [],
      }),
    });
    const mutations = makeMutations({
      confirmStripePayment: vi.fn().mockResolvedValue({ id: 'order-route', status: 'processing' }),
    });
    const recordOperatorAction = vi.fn().mockResolvedValue(undefined);
    const flow = makeFlow(mutations, orderRepo, { recordOperatorAction });

    const actionResult = await flow.handleReconciliationOperatorAction({
      caseId: 'pi_route_paid_not_finalized',
      action: 'retry_recovery',
      reason: 'operator retry',
      actor: { id: 'admin-1', email: 'admin@test.com' },
    });

    expect(actionResult.ok).toBe(true);
    expect(recordOperatorAction).toHaveBeenNthCalledWith(1, {
      caseId: 'pi_route_paid_not_finalized',
      action: 'retry_recovery',
      reason: 'operator retry',
      actor: { id: 'admin-1', email: 'admin@test.com' },
    });
    expect(mutations.confirmStripePayment).toHaveBeenCalledWith('pi_route', undefined, 'admin@test.com');
    expect(recordOperatorAction).toHaveBeenNthCalledWith(2, {
      caseId: 'pi_route_paid_not_finalized',
      action: 'mark_resolved',
      reason: 'Automated recovery retry completed successfully: operator retry',
      actor: { id: 'admin-1', email: 'admin@test.com' },
    });
  });

  it('handleReconciliationOperatorAction is idempotent for duplicate retry_recovery', async () => {
    const orderRepo = makeOrderRepo({
      getReconciliationCase: vi.fn().mockResolvedValue({
        paymentIntentId: 'pi_dup',
        reason: 'paid_not_finalized',
        severity: 'high',
        operatorVisibleMessage: 'needs recovery',
        evidence: [],
      }),
    });
    const mutations = makeMutations({
      confirmStripePayment: vi.fn().mockResolvedValue({ id: 'order-dup', status: 'processing' }),
    });
    const eventLog = new InMemoryCheckoutEventLog();
    const recordOperatorAction = vi.fn().mockResolvedValue(undefined);
    const flow = makeFlow(mutations, orderRepo, { eventLog, recordOperatorAction });
    const input = {
      caseId: 'pi_dup_paid_not_finalized',
      action: 'retry_recovery' as const,
      reason: 'operator retry',
      actor: { id: 'admin-1', email: 'admin@test.com' },
    };

    const first = await flow.handleReconciliationOperatorAction(input);
    const second = await flow.handleReconciliationOperatorAction(input);

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    if (!first.ok || !second.ok) return;
    expect(first.duplicate).toBeFalsy();
    expect(second.duplicate).toBe(true);
    expect(mutations.confirmStripePayment).toHaveBeenCalledTimes(1);
  });

  it('handleCheckoutWebhook dedupes completed Stripe events', async () => {
    const mutations = makeMutations();
    const stripe = {
      constructEvent: vi.fn().mockReturnValue({
        id: 'evt_dup',
        type: 'payment_intent.succeeded',
        data: { object: { id: 'pi_dup', metadata: {} } },
      }),
      tryProcessEvent: vi.fn().mockResolvedValue({ alreadyProcessed: true, claimToken: null }),
      getEventStatus: vi.fn().mockResolvedValue('completed'),
      markEventProcessed: vi.fn(),
      markEventFailed: vi.fn(),
    };
    const flow = makeFlow(mutations, makeOrderRepo(), { stripe });

    const result = await flow.handleCheckoutWebhook({ rawBody: 'payload', signature: 'sig' });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data).toMatchObject({ httpStatus: 200, received: true, duplicate: true });
    expect(mutations.confirmStripePayment).not.toHaveBeenCalled();
  });
});
