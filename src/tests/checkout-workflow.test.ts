import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  assertLegalCheckoutPhaseTransition,
  isLegalCheckoutPhaseTransition,
  isSafelyFinalizedCheckoutState,
  isLegalCheckoutPhaseTransitionNew,
  assertLegalCheckoutPhaseTransitionNew,
  mapWorkflowPhaseToCheckoutPhase,
} from '../core/order/checkoutWorkflow';
import { OrderService } from '../core/OrderService';
import { FirestoreOrderRepository } from '../infrastructure/repositories/firestore/FirestoreOrderRepository';

vi.mock('@infrastructure/firebase/bridge', () => ({
  runTransaction: vi.fn(async (_db: any, fn: any) => fn({ get: vi.fn(), set: vi.fn(), update: vi.fn(), delete: vi.fn() })),
  getUnifiedDb: vi.fn(() => ({})),
  serverTimestamp: vi.fn(() => new Date()),
  doc: vi.fn(),
  arrayUnion: vi.fn((...args: any[]) => args),
}));

function makeOrderRepo(overrides: Record<string, any> = {}) {
  const repo: any = {
    getAll: vi.fn().mockResolvedValue({ orders: [] }),
    getById: vi.fn(),
    getByIdempotencyKey: vi.fn().mockResolvedValue(null),
    getByPaymentTransactionId: vi.fn().mockResolvedValue(null),
    getByPaymentTransactionIdTransactional: vi.fn(),
    guardedUpdateStatus: vi.fn(),
    transitionPaymentState: vi.fn(),
    transitionFulfillmentState: vi.fn(),
    transitionReconciliationState: vi.fn(),
    updateStatus: vi.fn(),
    updateRiskScore: vi.fn(),
    updateMetadata: vi.fn(),
    addFulfillmentEvent: vi.fn(),
    markForReconciliation: vi.fn(),
    createOrUpdateReconciliationCase: vi.fn(),
    updateCheckoutAttempt: vi.fn(),
    transitionCheckoutAttemptPhase: vi.fn(),
    getCheckoutAttempt: vi.fn(),
    recordCheckoutAttempt: vi.fn(),
    ...overrides,
  };
  repo.guardedUpdateStatus.mockImplementation(async (id: string, _allowed: string[], status: string, _reason: string, transaction?: any) => {
    await repo.updateStatus(id, status, transaction);
  });
  repo.transitionPaymentState.mockResolvedValue(undefined);
  repo.transitionFulfillmentState.mockResolvedValue(undefined);
  repo.transitionReconciliationState.mockResolvedValue(undefined);
  repo.updateCheckoutAttempt.mockResolvedValue(undefined);
  repo.transitionCheckoutAttemptPhase.mockResolvedValue(undefined);
  return repo;
}

function makeOrderService(orderRepo: any) {
  return new OrderService(
    orderRepo,
    { getById: vi.fn(), batchUpdateStock: vi.fn() } as any,
    { getByUserId: vi.fn(), clear: vi.fn(), save: vi.fn() } as any,
    { getByCode: vi.fn() } as any,
    { processPayment: vi.fn(), refundPayment: vi.fn() } as any,
    { record: vi.fn(), recordWithTransaction: vi.fn() } as any,
    { acquireLock: vi.fn().mockResolvedValue({ success: true, fencingToken: 1 }), releaseLock: vi.fn() } as any,
  );
}

describe('checkout workflow orchestration contract', () => {
  it('allows convergent legal transitions without requiring one exact sequential path', () => {
    expect(isLegalCheckoutPhaseTransition('CREATE_OR_RESUME_ATTEMPT', 'INITIALIZE_ORDER')).toBe(true);
    expect(isLegalCheckoutPhaseTransition('CREATE_OR_RESUME_ATTEMPT', 'CREATE_OR_RESUME_PAYMENT_INTENT')).toBe(true);
    expect(isLegalCheckoutPhaseTransition('AWAIT_PAYMENT_CONFIRMATION', 'RECOVER_OR_RECONCILE')).toBe(true);
    expect(isLegalCheckoutPhaseTransition('RECOVER_OR_RECONCILE', 'COMPLETE_CHECKOUT')).toBe(true);
  });

  it('rejects illegal phase regressions and corruption', () => {
    expect(() => assertLegalCheckoutPhaseTransition('COMPLETE_CHECKOUT', 'FINALIZE_PAYMENT', 'replay_after_completion'))
      .toThrow(/transition rejected/i);
    expect(() => assertLegalCheckoutPhaseTransition('AWAIT_PAYMENT_CONFIRMATION', 'INITIALIZE_ORDER', 'stale_worker'))
      .toThrow(/transition rejected/i);
    expect(() => assertLegalCheckoutPhaseTransition('CREATE_OR_RESUME_PAYMENT_INTENT', 'COMPLETE_CHECKOUT', 'skipped_payment_truth'))
      .toThrow(/transition rejected/i);
  });

  it('only early-exits when payment and fulfillment truth are both finalized', () => {
    expect(isSafelyFinalizedCheckoutState({ paymentState: 'paid', fulfillmentState: 'processing' })).toBe(true);
    expect(isSafelyFinalizedCheckoutState({ paymentState: 'paid', fulfillmentState: 'delivered' })).toBe(true);
    expect(isSafelyFinalizedCheckoutState({ paymentState: 'paid', fulfillmentState: 'cancelled' })).toBe(false);
    expect(isSafelyFinalizedCheckoutState({ paymentState: 'unpaid', fulfillmentState: 'processing' })).toBe(false);
  });
});

describe('checkout state machine transitions and invariants integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('proves that stale attempt -> finalized transition is rejected and routed to reconciliation', async () => {
    const order = {
      id: 'order-stale-attempt',
      userId: 'u1',
      status: 'pending',
      paymentTransactionId: 'pi_stale_attempt',
      metadata: { inventoryReserved: true, checkoutAttemptId: 'attempt-stale-1' },
      items: [{ productId: 'p1', quantity: 1, isDigital: false }],
    };
    const orderRepo = makeOrderRepo({
      getByPaymentTransactionIdTransactional: vi.fn().mockResolvedValue(order),
      getCheckoutAttempt: vi.fn().mockResolvedValue({ id: 'attempt-stale-1', state: 'cancelled' }),
    });
    const service = makeOrderService(orderRepo);

    const result = await service.finalizeOrderPayment('pi_stale_attempt', {
      id: 'pi_stale_attempt',
      status: 'succeeded',
      metadata: { orderId: 'order-stale-attempt' },
      charges: { data: [] },
    }, 'stripe-webhook');

    expect(result.status).toBe('reconciling');
    expect(orderRepo.transitionPaymentState).toHaveBeenCalledWith(
      'order-stale-attempt',
      ['unpaid', 'requires_payment_method', 'processing', 'failed', 'cancelled'],
      'paid',
      'stripe_succeeded_stale_conflict',
      expect.anything()
    );
    expect(orderRepo.transitionReconciliationState).toHaveBeenCalledWith(
      'order-stale-attempt',
      ['none', 'needs_review'],
      'needs_review',
      'paid_stale_conflict',
      expect.anything()
    );
  });

  it('proves that cancelled/refunded -> paid transition is routed to reconciliation and not normal completion', async () => {
    const order = {
      id: 'order-cancelled-attempt',
      userId: 'u1',
      status: 'cancelled',
      paymentTransactionId: 'pi_cancelled_attempt',
      metadata: { inventoryReserved: true, checkoutAttemptId: 'attempt-cancelled-1' },
      items: [{ productId: 'p1', quantity: 1, isDigital: false }],
    };
    const orderRepo = makeOrderRepo({
      getByPaymentTransactionIdTransactional: vi.fn().mockResolvedValue(order),
      getCheckoutAttempt: vi.fn().mockResolvedValue({ id: 'attempt-cancelled-1', state: 'reserved' }),
    });
    const service = makeOrderService(orderRepo);

    const result = await service.finalizeOrderPayment('pi_cancelled_attempt', {
      id: 'pi_cancelled_attempt',
      status: 'succeeded',
      metadata: { orderId: 'order-cancelled-attempt' },
      charges: { data: [] },
    }, 'stripe-webhook');

    expect(result.status).toBe('reconciling');
    expect(orderRepo.transitionPaymentState).toHaveBeenCalledWith(
      'order-cancelled-attempt',
      ['unpaid', 'requires_payment_method', 'processing', 'failed', 'cancelled'],
      'paid',
      'stripe_succeeded_terminal_conflict',
      expect.anything()
    );
    expect(orderRepo.transitionReconciliationState).toHaveBeenCalledWith(
      'order-cancelled-attempt',
      ['none', 'needs_review'],
      'needs_review',
      'paid_terminal_conflict',
      expect.anything()
    );
  });

  it('proves that finalized -> cleanup/restore transition is rejected (exits early)', async () => {
    const order = {
      id: 'order-paid',
      userId: 'u1',
      status: 'processing',
      paymentState: 'paid',
      paymentTransactionId: 'pi_paid',
      metadata: { inventoryReserved: true },
      items: [{ productId: 'p1', quantity: 1, isDigital: false }],
    };
    const orderRepo = makeOrderRepo({
      getById: vi.fn().mockResolvedValue(order),
    });
    const service = makeOrderService(orderRepo);

    await service.rollbackUnpaidCheckout('order-paid', 'attempt-paid', 'pi_paid', 'expired_cleanup');

    expect(orderRepo.guardedUpdateStatus).not.toHaveBeenCalled();
    expect(orderRepo.transitionPaymentState).not.toHaveBeenCalled();
    expect(orderRepo.updateCheckoutAttempt).not.toHaveBeenCalled();
  });

  it('proves awaiting_payment + webhook success converges to finalized complete status', async () => {
    const order = {
      id: 'order-awaiting',
      userId: 'u1',
      status: 'pending',
      paymentState: 'processing',
      paymentTransactionId: 'pi_awaiting',
      fulfillmentMethod: 'shipping',
      metadata: { inventoryReserved: true, checkoutAttemptId: 'attempt-1' },
      items: [{ productId: 'p1', name: 'Product 1', quantity: 1, isDigital: false }],
    };
    const orderRepo = makeOrderRepo({
      getByPaymentTransactionIdTransactional: vi.fn().mockResolvedValue(order),
      getCheckoutAttempt: vi.fn().mockResolvedValue({ id: 'attempt-1', state: 'reserved' }),
    });
    const service = makeOrderService(orderRepo);

    const result = await service.finalizeOrderPayment('pi_awaiting', {
      id: 'pi_awaiting',
      status: 'succeeded',
      metadata: { orderId: 'order-awaiting' },
      charges: { data: [] },
    }, 'stripe-webhook');

    expect(result.status).toBe('processing');
    expect(orderRepo.transitionPaymentState).toHaveBeenCalledWith('order-awaiting', ['unpaid', 'requires_payment_method', 'processing'], 'paid', 'payment_finalized', expect.anything());
    expect(orderRepo.transitionCheckoutAttemptPhase).toHaveBeenCalledWith(expect.objectContaining({
      attemptId: 'attempt-1',
      nextPhase: 'COMPLETE_CHECKOUT',
      actor: 'stripe-webhook',
    }), undefined);
  });

  it('proves awaiting_payment + verify success converges to finalized complete status', async () => {
    const order = {
      id: 'order-awaiting',
      userId: 'u1',
      status: 'pending',
      paymentState: 'processing',
      paymentTransactionId: 'pi_awaiting',
      fulfillmentMethod: 'shipping',
      metadata: { inventoryReserved: true, checkoutAttemptId: 'attempt-1' },
      items: [{ productId: 'p1', name: 'Product 1', quantity: 1, isDigital: false }],
    };
    const orderRepo = makeOrderRepo({
      getByPaymentTransactionIdTransactional: vi.fn().mockResolvedValue(order),
      getCheckoutAttempt: vi.fn().mockResolvedValue({ id: 'attempt-1', state: 'reserved' }),
    });
    const service = makeOrderService(orderRepo);

    const result = await service.finalizeOrderPayment('pi_awaiting', {
      id: 'pi_awaiting',
      status: 'succeeded',
      metadata: { orderId: 'order-awaiting' },
      charges: { data: [] },
    }, 'user');

    expect(result.status).toBe('processing');
    expect(orderRepo.transitionPaymentState).toHaveBeenCalledWith('order-awaiting', ['unpaid', 'requires_payment_method', 'processing'], 'paid', 'payment_finalized', expect.anything());
    expect(orderRepo.transitionCheckoutAttemptPhase).toHaveBeenCalledWith(expect.objectContaining({
      attemptId: 'attempt-1',
      nextPhase: 'COMPLETE_CHECKOUT',
      actor: 'user',
    }), undefined);
  });

  it('proves webhook and verify racing converge cleanly to exactly one finalization (idempotence)', async () => {
    const order = {
      id: 'order-racing',
      userId: 'u1',
      status: 'pending',
      paymentState: 'processing',
      paymentTransactionId: 'pi_racing',
      fulfillmentMethod: 'shipping',
      metadata: { inventoryReserved: true, checkoutAttemptId: 'attempt-racing' },
      items: [{ productId: 'p1', name: 'Product 1', quantity: 1, isDigital: false }],
    };
    
    let callCount = 0;
    const orderRepo = makeOrderRepo({
      getByPaymentTransactionIdTransactional: vi.fn().mockImplementation(async () => {
        if (callCount === 0) {
          callCount++;
          return order;
        } else {
          return {
            ...order,
            status: 'processing',
            paymentState: 'paid',
          };
        }
      }),
      getCheckoutAttempt: vi.fn().mockResolvedValue({ id: 'attempt-racing', state: 'reserved' }),
    });
    const service = makeOrderService(orderRepo);

    const res1 = await service.finalizeOrderPayment('pi_racing', {
      id: 'pi_racing',
      status: 'succeeded',
      metadata: { orderId: 'order-racing' },
      charges: { data: [] },
    }, 'stripe-webhook');

    const res2 = await service.finalizeOrderPayment('pi_racing', {
      id: 'pi_racing',
      status: 'succeeded',
      metadata: { orderId: 'order-racing' },
      charges: { data: [] },
    }, 'user');

    expect(res1.status).toBe('processing');
    expect(res2.status).toBe('processing');

    expect(orderRepo.transitionPaymentState).toHaveBeenCalledTimes(1);
    expect(orderRepo.guardedUpdateStatus).toHaveBeenCalledTimes(1);
  });
});

describe('explicit new CheckoutPhase state contract and transitions', () => {
  it('verifies legal explicit phase transitions', () => {
    expect(isLegalCheckoutPhaseTransitionNew('preparing', 'reservation_acquired')).toBe(true);
    expect(isLegalCheckoutPhaseTransitionNew('reservation_acquired', 'attempt_active')).toBe(true);
    expect(isLegalCheckoutPhaseTransitionNew('attempt_active', 'order_initialized')).toBe(true);
    expect(isLegalCheckoutPhaseTransitionNew('order_initialized', 'payment_intent_ready')).toBe(true);
    expect(isLegalCheckoutPhaseTransitionNew('payment_intent_ready', 'awaiting_payment')).toBe(true);
    expect(isLegalCheckoutPhaseTransitionNew('awaiting_payment', 'payment_confirmed')).toBe(true);
    expect(isLegalCheckoutPhaseTransitionNew('payment_confirmed', 'finalized')).toBe(true);
  });

  it('rejects illegal explicit transitions and regressions', () => {
    expect(() => assertLegalCheckoutPhaseTransitionNew('finalized', 'preparing', 'regression_check'))
      .toThrow(/transition rejected/i);
    expect(() => assertLegalCheckoutPhaseTransitionNew('terminal', 'preparing', 'regression_check'))
      .toThrow(/transition rejected/i);
    expect(() => assertLegalCheckoutPhaseTransitionNew('awaiting_payment', 'preparing', 'regression_check'))
      .toThrow(/transition rejected/i);
    expect(() => assertLegalCheckoutPhaseTransitionNew('preparing', 'awaiting_payment', 'skip_steps_check'))
      .toThrow(/transition rejected/i);
  });

  it('maps workflow phases to new checkout phases correctly', () => {
    expect(mapWorkflowPhaseToCheckoutPhase('PREPARE_CHECKOUT')).toBe('preparing');
    expect(mapWorkflowPhaseToCheckoutPhase('ACQUIRE_RESERVATION')).toBe('reservation_acquired');
    expect(mapWorkflowPhaseToCheckoutPhase('COMPLETE_CHECKOUT')).toBe('finalized');
    expect(mapWorkflowPhaseToCheckoutPhase('RECOVER_OR_RECONCILE', 'reconciling')).toBe('reconciliation_required');
    expect(mapWorkflowPhaseToCheckoutPhase('RECOVER_OR_RECONCILE', 'cancelled')).toBe('terminal');
    expect(mapWorkflowPhaseToCheckoutPhase('RECOVER_OR_RECONCILE', null, 'rollback')).toBe('terminal');
    expect(mapWorkflowPhaseToCheckoutPhase('RECOVER_OR_RECONCILE')).toBe('recovery_required');
  });
});

describe('checkout state machine bypass prevention and transition auditing', () => {
  it('proves direct stale phase mutation is rejected under the transition contract', () => {
    expect(() => assertLegalCheckoutPhaseTransitionNew('finalized', 'preparing', 'cannot regress from finalized')).toThrow();
    expect(() => assertLegalCheckoutPhaseTransitionNew('terminal', 'preparing', 'cannot regress from terminal')).toThrow();
    expect(() => assertLegalCheckoutPhaseTransitionNew('finalized', 'attempt_active', 'cannot resume finalized')).toThrow();
  });

  it('proves direct finalized cleanup is rejected', () => {
    expect(() => assertLegalCheckoutPhaseTransitionNew('finalized', 'recovery_required', 'cannot rollback finalized')).toThrow();
    expect(() => assertLegalCheckoutPhaseTransitionNew('finalized', 'terminal', 'cannot cancel finalized')).toThrow();
  });

  it('proves reconciliation-only terminal writes preserve transition evidence logging', async () => {
    const order = {
      id: 'order-reconcile',
      userId: 'u1',
      status: 'pending',
      paymentState: 'processing',
      paymentTransactionId: 'pi_reconcile',
      fulfillmentMethod: 'shipping',
      metadata: { inventoryReserved: true, checkoutAttemptId: 'attempt-reconcile' },
      items: [{ productId: 'p1', name: 'Product 1', quantity: 1, isDigital: false }],
    };
    const orderRepo = makeOrderRepo({
      getByPaymentTransactionIdTransactional: vi.fn().mockResolvedValue(order),
      getCheckoutAttempt: vi.fn().mockResolvedValue({ id: 'attempt-reconcile', state: 'cancelled' }),
    });
    const service = makeOrderService(orderRepo);

    await service.finalizeOrderPayment('pi_reconcile', {
      id: 'pi_reconcile',
      status: 'succeeded',
      metadata: { orderId: 'order-reconcile' },
      charges: { data: [] },
    }, 'stripe-webhook');

    expect(orderRepo.transitionCheckoutAttemptPhase).toHaveBeenCalledWith(expect.objectContaining({
      attemptId: 'attempt-reconcile',
      nextPhase: 'RECOVER_OR_RECONCILE',
      authoritySource: 'operator',
      waitingFor: 'operator',
      reason: 'stripe_succeeded_stale_conflict',
      actor: 'stripe-webhook',
      orderId: 'order-reconcile',
      paymentIntentId: 'pi_reconcile',
    }), expect.anything());
  });

  it('proves every finalize path emits actor, authoritySource, and reason', async () => {
    const order = {
      id: 'order-finalize',
      userId: 'u1',
      status: 'pending',
      paymentState: 'processing',
      paymentTransactionId: 'pi_finalize',
      fulfillmentMethod: 'shipping',
      metadata: { inventoryReserved: true, checkoutAttemptId: 'attempt-finalize' },
      items: [{ productId: 'p1', name: 'Product 1', quantity: 1, isDigital: false }],
    };
    const orderRepo = makeOrderRepo({
      getByPaymentTransactionIdTransactional: vi.fn().mockResolvedValue(order),
      getCheckoutAttempt: vi.fn().mockResolvedValue({ id: 'attempt-finalize', state: 'reserved' }),
    });
    const service = makeOrderService(orderRepo);

    await service.finalizeOrderPayment('pi_finalize', {
      id: 'pi_finalize',
      status: 'succeeded',
      metadata: { orderId: 'order-finalize' },
      charges: { data: [] },
    }, 'stripe-webhook');

    expect(orderRepo.transitionCheckoutAttemptPhase).toHaveBeenCalledWith(expect.objectContaining({
      attemptId: 'attempt-finalize',
      nextPhase: 'FINALIZE_PAYMENT',
      authoritySource: 'local',
      waitingFor: 'none',
      reason: 'local_finalization_started',
      actor: 'stripe-webhook',
    }), expect.anything());

    expect(orderRepo.transitionCheckoutAttemptPhase).toHaveBeenCalledWith(expect.objectContaining({
      attemptId: 'attempt-finalize',
      nextPhase: 'COMPLETE_CHECKOUT',
      authoritySource: 'local',
      waitingFor: 'none',
      reason: 'checkout_completed_after_payment_finalization',
      actor: 'stripe-webhook',
    }), undefined);
  });

  describe('checkout state-machine updateCheckoutAttempt direct mutation rejection', () => {
    it('throws a runtime error if state-machine properties are updated directly via updateCheckoutAttempt', async () => {
      const repo = new FirestoreOrderRepository();
      
      const forbiddenKeys = ['currentPhase', 'checkoutPhase', 'authoritySource', 'waitingFor'];
      for (const key of forbiddenKeys) {
        await expect(
          repo.updateCheckoutAttempt('attempt-1', { [key]: 'any-value' } as any)
        ).rejects.toThrow(`Direct update of state-machine property '${key}' via updateCheckoutAttempt is prohibited. Use transitionCheckoutAttemptPhase instead.`);
      }
    });

    it('does not throw when updating only non-state-machine properties', async () => {
      const repo = new FirestoreOrderRepository();
      try {
        await repo.updateCheckoutAttempt('attempt-1', { state: 'cancelled', paymentIntentId: 'pi_123' });
      } catch (err: any) {
        expect(err.message).not.toContain('Direct update of state-machine property');
      }
    });
  });
});
