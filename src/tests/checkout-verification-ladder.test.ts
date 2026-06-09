import { describe, expect, it, vi, beforeEach } from 'vitest';
import { CheckoutFlowService } from '../core/order/CheckoutFlowService';
import { InMemoryCheckoutEventLog } from './helpers/inMemoryCheckoutEventLog';
import { checkoutFromError } from '../core/order/checkoutResult';
import { UnauthorizedError } from '@domain/errors';

function makeStripe(overrides: Record<string, ReturnType<typeof vi.fn>> = {}) {
  return {
    constructEvent: vi.fn(),
    tryProcessEvent: vi.fn(),
    getEventStatus: vi.fn(),
    getPaymentIntent: vi.fn(),
    markEventProcessed: vi.fn(),
    markEventFailed: vi.fn(),
    createPaymentIntent: vi.fn(),
    cancelPaymentIntent: vi.fn(),
    ...overrides,
  };
}

function makeFlow(options: {
  mutations?: Record<string, ReturnType<typeof vi.fn>>;
  orderRepo?: Record<string, ReturnType<typeof vi.fn>>;
  stripe?: ReturnType<typeof makeStripe>;
  eventLog?: InMemoryCheckoutEventLog;
  recordOperatorAction?: ReturnType<typeof vi.fn>;
  cancelExpiredPendingOrder?: ReturnType<typeof vi.fn>;
}) {
  const mutations = {
    runCheckoutReservation: vi.fn(),
    rollbackUnpaidCheckout: vi.fn(),
    confirmStripePayment: vi.fn().mockResolvedValue({ id: 'order-1', status: 'processing' }),
    ...options.mutations,
  };
  const orderRepo = {
    getAll: vi.fn().mockResolvedValue({ orders: [] }),
    getById: vi.fn().mockResolvedValue({ id: 'order-1', metadata: {} }),
    getReconciliationCase: vi.fn(),
    updateMetadata: vi.fn(),
    createOrUpdateReconciliationCase: vi.fn(),
    transitionCheckoutAttemptPhase: vi.fn(),
    ...options.orderRepo,
  };
  return new CheckoutFlowService(mutations as any, orderRepo as any, {
    stripe: options.stripe as any,
    eventLog: options.eventLog ?? new InMemoryCheckoutEventLog(),
    recordOperatorAction: options.recordOperatorAction ?? vi.fn().mockResolvedValue(undefined),
    cancelExpiredPendingOrder: options.cancelExpiredPendingOrder ?? vi.fn().mockResolvedValue(undefined),
  });
}

describe('Checkout verification ladder (frozen protocol)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('[webhook duplicate] does not double-mark paid on duplicate Stripe events', async () => {
    const confirmStripePayment = vi.fn().mockResolvedValue({ id: 'order-paid', status: 'processing' });
    const stripe = makeStripe({
      constructEvent: vi.fn().mockReturnValue({
        id: 'evt_dup_proof',
        type: 'payment_intent.succeeded',
        data: { object: { id: 'pi_dup_proof', metadata: { orderId: 'order-paid' } } },
      }),
      tryProcessEvent: vi.fn()
        .mockResolvedValueOnce({ alreadyProcessed: false, claimToken: 'claim-1' })
        .mockResolvedValueOnce({ alreadyProcessed: true, claimToken: null }),
      getEventStatus: vi.fn().mockResolvedValue('completed'),
      markEventProcessed: vi.fn(),
    });
    const flow = makeFlow({ mutations: { confirmStripePayment }, stripe });

    const first = await flow.handleCheckoutWebhook({ rawBody: '{}', signature: 'sig' });
    const second = await flow.handleCheckoutWebhook({ rawBody: '{}', signature: 'sig' });

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expect(second.duplicate).toBe(true);
    expect(confirmStripePayment).toHaveBeenCalledTimes(1);
    expect(stripe.markEventProcessed).toHaveBeenCalledTimes(1);
  });

  it('[retry_recovery duplicate] does not double-run Stripe recovery', async () => {
    const confirmStripePayment = vi.fn().mockResolvedValue({ id: 'order-rec', status: 'processing' });
    const orderRepo = {
      getReconciliationCase: vi.fn().mockResolvedValue({
        paymentIntentId: 'pi_rec',
        orderId: 'order-rec',
        reason: 'paid_not_finalized',
        severity: 'high',
        operatorVisibleMessage: 'recover',
        evidence: [],
      }),
      getById: vi.fn().mockResolvedValue({ id: 'order-rec', metadata: {} }),
      updateMetadata: vi.fn(),
    };
    const eventLog = new InMemoryCheckoutEventLog();
    const flow = makeFlow({ mutations: { confirmStripePayment }, orderRepo, eventLog });
    const input = {
      caseId: 'pi_rec_paid_not_finalized',
      action: 'retry_recovery' as const,
      reason: 'proof',
      actor: { id: 'admin-1', email: 'admin@test.com' },
    };

    const first = await flow.handleReconciliationOperatorAction(input);
    const second = await flow.handleReconciliationOperatorAction(input);

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expect(second.duplicate).toBe(true);
    expect(confirmStripePayment).toHaveBeenCalledTimes(1);
  });

  it('[cleanup partial failure] returns ok report with failures, does not throw', async () => {
    const orders = [
      { id: 'order-ok', userId: 'u1', status: 'pending', paymentTransactionId: null, metadata: {}, items: [] },
      { id: 'order-fail', userId: 'u1', status: 'pending', paymentTransactionId: null, metadata: {}, items: [] },
    ];
    const cancelExpiredPendingOrder = vi.fn()
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('cancel blocked'));
    const orderRepo = {
      getAll: vi.fn().mockResolvedValue({ orders }),
      getById: vi.fn().mockImplementation(async (id: string) => orders.find((o) => o.id === id)),
      updateMetadata: vi.fn(),
    };
    const flow = makeFlow({ orderRepo, cancelExpiredPendingOrder, stripe: makeStripe() });

    const result = await flow.cleanupExpiredPendingOrders({ maxAgeMinutes: 60 });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.scanned).toBe(2);
    expect(result.data.cancelled).toBe(1);
    expect(result.data.failed).toBe(1);
    expect(result.data.errors).toHaveLength(1);
    expect(result.data.errors[0]).toMatchObject({ orderId: 'order-fail', code: 'cancel_failed' });
  });

  it('[expected failures] map public checkout failures to CheckoutResult errors', async () => {
    const mutations = { runCheckoutReservation: vi.fn(), rollbackUnpaidCheckout: vi.fn(), confirmStripePayment: vi.fn() };
    const unconfigured = new CheckoutFlowService(mutations as any, { getById: vi.fn() } as any, {});

    const session = await unconfigured.createCheckoutSession({
      userId: 'u1',
      shippingAddress: { street: '1', city: 'X', state: 'CO', zip: '80202', country: 'US' },
      idempotencyKey: 'k1',
    });
    expect(session.ok).toBe(false);
    if (session.ok) return;
    expect(session.code).toBe('STRIPE_NOT_CONFIGURED');

    const cleanup = await unconfigured.cleanupExpiredPendingOrders({ maxAgeMinutes: 60 });
    expect(cleanup.ok).toBe(false);
    if (cleanup.ok) return;
    expect(cleanup.code).toBe('STRIPE_NOT_CONFIGURED');

    const operator = await unconfigured.handleReconciliationOperatorAction({
      caseId: 'c1',
      action: 'mark_resolved',
      reason: 'r',
      actor: { id: 'a', email: 'a@t.com' },
    });
    expect(operator.ok).toBe(false);
    if (operator.ok) return;
    expect(operator.code).toBe('OPERATOR_NOT_CONFIGURED');
  });

  it('[unexpected crash] maps transient errors to UNKNOWN retryable 503 contract', () => {
    const result = checkoutFromError(new Error('Stripe unavailable'));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe('UNKNOWN');
    expect(result.retryable).toBe(true);
  });

  it('[domain errors] map UnauthorizedError to FORBIDDEN CheckoutResult', () => {
    const result = checkoutFromError(new UnauthorizedError('Fresh session verification required.'));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe('FORBIDDEN');
    expect(result.retryable).toBe(false);
  });
});
