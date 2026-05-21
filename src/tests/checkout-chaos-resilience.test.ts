import { describe, expect, it, vi, beforeEach } from 'vitest';
import { OrderCheckoutService } from '../core/order/OrderCheckoutService';
import {
  reconstructTimeline,
  renderTransitionStream,
  correlateGroupedEvents,
  generateReconciliationEvidenceSummary,
  runAuthoritativeDiagnostics,
} from '../core/order/checkoutForensics';
import type {
  Order,
  CheckoutAttempt,
  PaymentReconciliationCase,
  Cart,
  OrderStatus,
  PaymentState,
  FulfillmentState,
  PaymentReconciliationReason,
  PaymentReconciliationFailureClassification,
  OrderNote,
} from '@domain/models';
import { CheckoutInProgressError, PaymentFailedError } from '@domain/errors';
import {
  assertLegalCheckoutOperationalPhaseTransition,
  assertLegalCheckoutPhaseTransition,
  mapWorkflowPhaseToCheckoutPhase,
} from '../core/order/checkoutWorkflow';
import { expectFencingConflictDiagnostics } from './helpers/checkoutForensicAssertions';

// Mock Firebase bridge for tests with serializable queue to prevent in-memory interleaving races
vi.mock('@infrastructure/firebase/bridge', () => {
  let activeTxPromise: Promise<any> = Promise.resolve();
  return {
    runTransaction: vi.fn(async (_db: any, fn: any) => {
      const run = async () => {
        const transaction = {
          get: vi.fn(),
          set: vi.fn(),
          update: vi.fn(),
          delete: vi.fn(),
        };
        return fn(transaction);
      };
      const next = activeTxPromise.then(run, run);
      activeTxPromise = next.catch(() => {}); // Prevent chain break on error
      return next;
    }),
    getUnifiedDb: vi.fn(() => ({})),
    serverTimestamp: vi.fn(() => new Date()),
    doc: vi.fn(),
    arrayUnion: vi.fn((...args: any[]) => args),
  };
});

class MemoryDatabase {
  orders = new Map<string, Order>();
  checkoutAttempts = new Map<string, CheckoutAttempt>();
  reconciliationCases = new Map<string, PaymentReconciliationCase>();
  carts = new Map<string, Cart>();
  stocks = new Map<string, number>();
  discounts = new Map<string, any>();
  userDiscountUsages = new Map<string, string[]>();

  reset() {
    this.orders.clear();
    this.checkoutAttempts.clear();
    this.reconciliationCases.clear();
    this.carts.clear();
    this.stocks.clear();
    this.discounts.clear();
    this.userDiscountUsages.clear();
  }
}

describe('Checkout Orchestration Bounded Distributed-Chaos & Resilience', () => {
  const db = new MemoryDatabase();

  // Create repository mocks that delegate to MemoryDatabase
  const mockOrderRepo: any = {
    create: vi.fn(async (orderData: any) => {
      const id = orderData.id || `order-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
      const order = {
        ...orderData,
        id,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Order;
      db.orders.set(id, order);
      return order;
    }),

    getById: vi.fn(async (id: string) => {
      return db.orders.get(id) || null;
    }),

    getByIdempotencyKey: vi.fn(async (key: string) => {
      for (const order of db.orders.values()) {
        if (order.idempotencyKey === key) return order;
      }
      return null;
    }),

    getByPaymentTransactionId: vi.fn(async (txId: string) => {
      for (const order of db.orders.values()) {
        if (order.paymentTransactionId === txId) return order;
      }
      return null;
    }),

    getByPaymentTransactionIdTransactional: vi.fn(async (txId: string) => {
      for (const order of db.orders.values()) {
        if (order.paymentTransactionId === txId) return order;
      }
      return null;
    }),

    updatePaymentTransactionId: vi.fn(async (orderId: string, txId: string) => {
      const order = db.orders.get(orderId);
      if (order) {
        order.paymentTransactionId = txId;
        order.updatedAt = new Date();
      }
    }),

    transitionPaymentState: vi.fn(async (orderId: string, allowed: PaymentState[], nextState: PaymentState, reason: string) => {
      const order = db.orders.get(orderId);
      if (!order) throw new Error(`Order ${orderId} not found`);
      if (order.paymentState === nextState) return; // Idempotent check
      if (order.paymentState && !allowed.includes(order.paymentState)) {
        throw new Error(`Invalid payment transition from ${order.paymentState} to ${nextState}`);
      }
      order.paymentState = nextState;
      order.updatedAt = new Date();
    }),

    transitionFulfillmentState: vi.fn(async (orderId: string, allowed: FulfillmentState[], nextState: FulfillmentState, reason: string) => {
      const order = db.orders.get(orderId);
      if (!order) throw new Error(`Order ${orderId} not found`);
      if (order.fulfillmentState === nextState) return; // Idempotent check
      if (order.fulfillmentState && !allowed.includes(order.fulfillmentState)) {
        throw new Error(`Invalid fulfillment transition from ${order.fulfillmentState} to ${nextState}`);
      }
      order.fulfillmentState = nextState;
      order.updatedAt = new Date();
    }),

    transitionReconciliationState: vi.fn(async (orderId: string, allowed: any[], nextState: any, reason: string) => {
      const order = db.orders.get(orderId);
      if (!order) throw new Error(`Order ${orderId} not found`);
      order.reconciliationState = nextState;
      order.updatedAt = new Date();
    }),

    guardedUpdateStatus: vi.fn(async (orderId: string, allowed: OrderStatus[], nextState: OrderStatus, reason: string) => {
      const order = db.orders.get(orderId);
      if (!order) throw new Error(`Order ${orderId} not found`);
      if (order.status === nextState) return; // Idempotent check
      if (order.status && !allowed.includes(order.status)) {
        throw new Error(`Invalid status transition from ${order.status} to ${nextState} (${reason})`);
      }
      order.status = nextState;
      order.updatedAt = new Date();
    }),

    updateRiskScore: vi.fn(async (orderId: string, riskScore: number) => {
      const order = db.orders.get(orderId);
      if (order) order.riskScore = riskScore;
    }),

    updateMetadata: vi.fn(async (orderId: string, metadata: any) => {
      const order = db.orders.get(orderId);
      if (order) order.metadata = { ...(order.metadata || {}), ...metadata };
    }),

    addFulfillmentEvent: vi.fn(async (orderId: string, event: any) => {
      const order = db.orders.get(orderId);
      if (order) {
        if (!order.fulfillmentEvents) order.fulfillmentEvents = [];
        order.fulfillmentEvents.push(event);
      }
    }),

    markForReconciliation: vi.fn(async (orderId: string, notes: string[]) => {
      const order = db.orders.get(orderId);
      if (order) {
        if (!order.notes) order.notes = [];
        const noteObjects: OrderNote[] = notes.map(txt => ({
          id: `note-${Math.random()}`,
          authorId: 'system',
          authorEmail: 'system@dreambees.art',
          text: txt,
          createdAt: new Date(),
        }));
        order.notes.push(...noteObjects);
      }
    }),

    recordCheckoutAttempt: vi.fn(async (attemptData: any) => {
      const attempt = {
        ...attemptData,
        checkoutPhase: attemptData.checkoutPhase || mapWorkflowPhaseToCheckoutPhase(attemptData.currentPhase),
        createdAt: new Date(),
        updatedAt: new Date(),
        phaseTransitions: {},
      } as CheckoutAttempt;
      db.checkoutAttempts.set(attemptData.id, attempt);
    }),

    getCheckoutAttempt: vi.fn(async (attemptId: string) => {
      return db.checkoutAttempts.get(attemptId) || null;
    }),

    getLatestCheckoutAttemptForUser: vi.fn(async (userId: string) => {
      let latest: CheckoutAttempt | null = null;
      for (const attempt of db.checkoutAttempts.values()) {
        if (attempt.userId === userId) {
          if (!latest || new Date(attempt.createdAt).getTime() > new Date(latest.createdAt).getTime()) {
            latest = attempt;
          }
        }
      }
      return latest;
    }),

    updateCheckoutAttempt: vi.fn(async (attemptId: string, updates: any) => {
      // Direct update fencing check
      const forbiddenKeys = ['currentPhase', 'checkoutPhase', 'authoritySource', 'waitingFor'];
      for (const key of forbiddenKeys) {
        if (key in updates) {
          throw new Error(`Direct update of state-machine property '${key}' via updateCheckoutAttempt is prohibited. Use transitionCheckoutAttemptPhase instead.`);
        }
      }

      const attempt = db.checkoutAttempts.get(attemptId);
      if (attempt) {
        Object.assign(attempt, updates);
        attempt.updatedAt = new Date();
      }
    }),

    transitionCheckoutAttemptPhase: vi.fn(async (params: any) => {
      const attempt = db.checkoutAttempts.get(params.attemptId);
      if (!attempt) throw new Error(`Checkout attempt ${params.attemptId} not found`);

      const currentPhase = attempt.currentPhase;
      if (currentPhase && !params.expectedPhases.includes(currentPhase)) {
        throw new Error(`Checkout phase stale update rejected: expected ${params.expectedPhases.join(', ')}, found ${currentPhase}`);
      }

      assertLegalCheckoutPhaseTransition(currentPhase, params.nextPhase, params.reason);

      const oldCheckoutPhase = attempt.checkoutPhase || mapWorkflowPhaseToCheckoutPhase(currentPhase);
      const nextCheckoutPhase = mapWorkflowPhaseToCheckoutPhase(
        params.nextPhase,
        params.nextPhase === 'RECOVER_OR_RECONCILE' ? 'reconciling' : (params.nextPhase === 'COMPLETE_CHECKOUT' ? 'paid' : attempt.state),
        params.reason
      );
      assertLegalCheckoutOperationalPhaseTransition(oldCheckoutPhase as any, nextCheckoutPhase as any, params.reason);

      attempt.currentPhase = params.nextPhase;
      attempt.checkoutPhase = nextCheckoutPhase;
      attempt.authoritySource = params.authoritySource;
      attempt.waitingFor = params.waitingFor;
      attempt.lastTransitionAt = new Date().toISOString();
      attempt.lastTransitionReason = params.reason;

      if (!attempt.phaseTransitionEvidence) attempt.phaseTransitionEvidence = [];
      if (params.evidence) attempt.phaseTransitionEvidence.push(...params.evidence);

      const transKey = `${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
      if (!(attempt as any).phaseTransitions) (attempt as any).phaseTransitions = {};
      (attempt as any).phaseTransitions[transKey] = {
        previousPhase: oldCheckoutPhase,
        previousWorkflowPhase: currentPhase || null,
        previousStatus: attempt.state,
        nextPhase: nextCheckoutPhase,
        nextWorkflowPhase: params.nextPhase,
        nextStatus: params.nextPhase === 'COMPLETE_CHECKOUT' ? 'paid' : attempt.state,
        authoritySource: params.authoritySource,
        actor: params.actor || 'system',
        reason: params.reason,
        attemptId: params.attemptId,
        orderId: params.orderId || attempt.orderId || null,
        paymentIntentId: params.paymentIntentId || attempt.paymentIntentId || null,
        transitionedAt: new Date().toISOString(),
        evidence: params.evidence || [],
      };
    }),

    createOrUpdateReconciliationCase: vi.fn(async (params: any) => {
      const existing = db.reconciliationCases.get(params.paymentIntentId);
      const data: PaymentReconciliationCase = {
        id: params.paymentIntentId,
        paymentIntentId: params.paymentIntentId,
        orderId: params.orderId,
        checkoutAttemptId: params.checkoutAttemptId,
        reason: params.reason as PaymentReconciliationReason,
        severity: params.severity || 'high',
        lifecycleState: params.lifecycleState || 'open',
        stripeStatus: params.stripeStatus || null,
        operatorVisibleMessage: params.operatorVisibleMessage || '',
        nextAction: params.nextAction || '',
        recommendedAction: 'Verify system logs and align database documents.',
        repairAttemptCount: existing ? existing.repairAttemptCount + 1 : 0,
        lastObservedStripeState: params.lastObservedStripeState || params.stripeStatus || null,
        lastObservedLocalState: params.lastObservedLocalState || null,
        details: params.details || {},
        createdAt: existing ? existing.createdAt : new Date(),
        updatedAt: new Date(),
        failureClassification: params.failureClassification as PaymentReconciliationFailureClassification,
      };
      db.reconciliationCases.set(params.paymentIntentId, data);
    }),

    recordUserDiscountUsage: vi.fn(async (userId: string, code: string) => {
      const usages = db.userDiscountUsages.get(userId) || [];
      usages.push(code);
      db.userDiscountUsages.set(userId, usages);
    }),

    removeUserDiscountUsage: vi.fn(async (userId: string, code: string) => {
      const usages = db.userDiscountUsages.get(userId) || [];
      const idx = usages.indexOf(code);
      if (idx !== -1) {
        usages.splice(idx, 1);
        db.userDiscountUsages.set(userId, usages);
      }
    }),
  };

  const mockProductRepo: any = {
    getById: vi.fn(async (productId: string) => {
      const stock = db.stocks.get(productId) ?? 10;
      return { id: productId, price: 1000, stock, name: `Product-${productId}` };
    }),

    batchUpdateStock: vi.fn(async (updates: any[]) => {
      updates.forEach((up) => {
        const current = db.stocks.get(up.id) ?? 10;
        const next = current + up.delta;
        if (next < 0) throw new Error('Insufficient stock');
        db.stocks.set(up.id, next);
      });
    }),
  };

  const mockCartRepo: any = {
    getByUserId: vi.fn(async (userId: string) => {
      return db.carts.get(userId) || null;
    }),

    clear: vi.fn(async (userId: string) => {
      db.carts.delete(userId);
    }),

    save: vi.fn(async (cart: Cart) => {
      db.carts.set(cart.userId, cart);
    }),
  };

  const mockDiscountRepo: any = {
    getByCode: vi.fn(async (code: string) => {
      return db.discounts.get(code) || null;
    }),

    incrementUsage: vi.fn(),
    decrementUsage: vi.fn(),
  };

  const mockPayment: any = {
    processPayment: vi.fn(),
    refundPayment: vi.fn(),
  };

  const mockAudit: any = {
    record: vi.fn(),
    recordWithTransaction: vi.fn(),
  };

  // Lock Provider with fencing token simulation
  let currentFencingToken = 1;
  const mockLocker: any = {
    acquireLock: vi.fn(async (id: string) => {
      currentFencingToken += 1;
      return { success: true, fencingToken: currentFencingToken };
    }),
    releaseLock: vi.fn(),
  };

  let service: OrderCheckoutService;

  beforeEach(() => {
    db.reset();
    vi.clearAllMocks();

    service = new OrderCheckoutService(
      mockOrderRepo,
      mockProductRepo,
      mockCartRepo,
      mockDiscountRepo,
      mockPayment,
      mockAudit,
      mockLocker
    );

    // Default setups
    db.stocks.set('p1', 5);
    db.carts.set('u1', {
      id: 'u1',
      userId: 'u1',
      items: [{ productId: 'p1', quantity: 1, priceSnapshot: 1000, name: 'P1', imageUrl: '/p1.png', isDigital: false }],
      updatedAt: new Date(),
    });
  });

  // 1. Stripe Webhook Duplication
  it('1. should process duplicated webhook deliveries idempotently and finalise only once', async () => {
    const address = { street: '123 St', city: 'City', state: 'ST', zip: '12345', country: 'US' };
    const idempotencyKey = 'attempt-dup-1';
    
    // Initiate without paymentMethodId to keep attempt in INITIALIZE_ORDER state
    const order = await service.initiateCheckout('u1', address as any, 'u1@ex.com', 'User 1', undefined, idempotencyKey);

    // Explicitly transition to AWAIT_PAYMENT_CONFIRMATION to simulate Stripe redirect/webhook expectations
    await mockOrderRepo.transitionCheckoutAttemptPhase({
      attemptId: idempotencyKey,
      expectedPhases: ['INITIALIZE_ORDER'],
      nextPhase: 'CREATE_OR_RESUME_PAYMENT_INTENT',
      authoritySource: 'local',
      waitingFor: 'none',
      reason: 'payment_intent_created_by_processor',
    });
    await mockOrderRepo.transitionCheckoutAttemptPhase({
      attemptId: idempotencyKey,
      expectedPhases: ['CREATE_OR_RESUME_PAYMENT_INTENT'],
      nextPhase: 'AWAIT_PAYMENT_CONFIRMATION',
      authoritySource: 'stripe',
      waitingFor: 'webhook',
      reason: 'payment_intent_ready_for_confirmation',
    });

    const attempt = db.checkoutAttempts.get(idempotencyKey)!;
    expect(attempt.currentPhase).toBe('AWAIT_PAYMENT_CONFIRMATION');

    // Attach paymentTransactionId to order
    await mockOrderRepo.updatePaymentTransactionId(order.id, 'pi_dup_123');

    // Deliver Webhook 1
    const stripePi = {
      id: 'pi_dup_123',
      status: 'succeeded',
      metadata: { orderId: order.id, fencingToken: attempt.fencingToken?.toString() },
      charges: { data: [] },
    };

    const firstResult = await service.finalizeOrderPayment('pi_dup_123', stripePi, 'stripe-webhook');
    expect(firstResult.status).toBe('processing'); // Physical shipping default
    expect(firstResult.paymentState).toBe('paid');

    const firstOrderState = db.orders.get(firstResult.id)!;
    expect(firstOrderState.paymentState).toBe('paid');

    // Deliver Webhook 2 (Duplicated)
    const secondResult = await service.finalizeOrderPayment('pi_dup_123', stripePi, 'stripe-webhook');
    expect(secondResult.status).toBe('processing');
    expect(secondResult.paymentState).toBe('paid');

    // Verify only 1 transitions happened at order repo level
    expect(mockOrderRepo.transitionPaymentState).toHaveBeenCalledTimes(1);
    expect(mockOrderRepo.guardedUpdateStatus).toHaveBeenCalledTimes(1);
  });

  // 2. Out-of-Order Webhook Arrivals
  it('2. should routing late succeeded webhook arriving after stale cleanup rollback to reconciliation', async () => {
    const orderData: any = {
      userId: 'u1',
      items: [{ productId: 'p1', quantity: 1, unitPrice: 1000, name: 'P1', fulfilledQty: 0, at: new Date() } as any],
      shippingAmount: 0,
      taxAmount: 0,
      discountAmount: 0,
      total: 1000,
      status: 'cancelled',
      paymentState: 'cancelled',
      fulfillmentState: 'unfulfilled',
      reconciliationState: 'none',
      shippingAddress: { street: '123 St', city: 'City', state: 'ST', zip: '12345', country: 'US' },
      idempotencyKey: 'attempt-stale-2',
      paymentTransactionId: 'pi_stale_999',
      metadata: { inventoryReserved: true, fencingToken: 4, checkoutAttemptId: 'attempt-stale-2' },
    };

    const mockOrder = await mockOrderRepo.create(orderData);
    await mockOrderRepo.recordCheckoutAttempt({
      id: 'attempt-stale-2',
      idempotencyKey: 'attempt-stale-2',
      userId: 'u1',
      orderId: mockOrder.id,
      cartId: 'u1',
      cartOwnerId: mockOrder.id,
      fencingToken: 4,
      state: 'cancelled',
      paymentIntentId: 'pi_stale_999',
      currentPhase: 'RECOVER_OR_RECONCILE',
      authoritySource: 'local',
      waitingFor: 'none',
    });

    const stripePi = {
      id: 'pi_stale_999',
      status: 'succeeded',
      metadata: { orderId: mockOrder.id, fencingToken: '4' },
      charges: { data: [] },
    };

    const result = await service.finalizeOrderPayment('pi_stale_999', stripePi, 'stripe-webhook');

    expect(result.status).toBe('reconciling');
    expect(mockOrderRepo.transitionReconciliationState).toHaveBeenCalledWith(
      mockOrder.id,
      ['none', 'needs_review'],
      'needs_review',
      'paid_stale_conflict',
      expect.anything()
    );

    const reconCase = db.reconciliationCases.get('pi_stale_999')!;
    expect(reconCase).toBeDefined();
    expect(reconCase.reason).toBe('paid_cancelled');
  });

  // 3. Verify Endpoint Replay
  it('3. should safely handle verification endpoint replays convergently', async () => {
    const address = { street: '123 St', city: 'City', state: 'ST', zip: '12345', country: 'US' };
    const key = 'attempt-replay-1';
    const order = await service.initiateCheckout('u1', address as any, 'u1@ex.com', 'User', undefined, key);

    await mockOrderRepo.transitionCheckoutAttemptPhase({
      attemptId: key,
      expectedPhases: ['INITIALIZE_ORDER'],
      nextPhase: 'CREATE_OR_RESUME_PAYMENT_INTENT',
      authoritySource: 'local',
      waitingFor: 'none',
      reason: 'payment_intent_created_by_processor',
    });
    await mockOrderRepo.transitionCheckoutAttemptPhase({
      attemptId: key,
      expectedPhases: ['CREATE_OR_RESUME_PAYMENT_INTENT'],
      nextPhase: 'AWAIT_PAYMENT_CONFIRMATION',
      authoritySource: 'stripe',
      waitingFor: 'webhook',
      reason: 'payment_intent_ready_for_confirmation',
    });

    await mockOrderRepo.updatePaymentTransactionId(order.id, 'pi_replay_345');

    const stripePi = {
      id: 'pi_replay_345',
      status: 'succeeded',
      metadata: { orderId: order.id, fencingToken: order.metadata?.fencingToken?.toString() },
      charges: { data: [] },
    };

    // Simulate verify endpoint triggers multiple times
    const r1 = await service.finalizeOrderPayment('pi_replay_345', stripePi, 'user');
    const r2 = await service.finalizeOrderPayment('pi_replay_345', stripePi, 'user');
    const r3 = await service.finalizeOrderPayment('pi_replay_345', stripePi, 'user');

    expect(r1.status).toBe('processing');
    expect(r2.status).toBe('processing');
    expect(r3.status).toBe('processing');
    expect(mockOrderRepo.transitionPaymentState).toHaveBeenCalledTimes(1);
  });

  // 4. Concurrent Verify + Webhook Execution
  it('4. should converge cleanly under concurrent verify and webhook finalisation races', async () => {
    const address = { street: '123 St', city: 'City', state: 'ST', zip: '12345', country: 'US' };
    const key = 'attempt-concurrent-1';
    const order = await service.initiateCheckout('u1', address as any, 'u1@ex.com', 'User', undefined, key);

    await mockOrderRepo.transitionCheckoutAttemptPhase({
      attemptId: key,
      expectedPhases: ['INITIALIZE_ORDER'],
      nextPhase: 'CREATE_OR_RESUME_PAYMENT_INTENT',
      authoritySource: 'local',
      waitingFor: 'none',
      reason: 'payment_intent_created_by_processor',
    });
    await mockOrderRepo.transitionCheckoutAttemptPhase({
      attemptId: key,
      expectedPhases: ['CREATE_OR_RESUME_PAYMENT_INTENT'],
      nextPhase: 'AWAIT_PAYMENT_CONFIRMATION',
      authoritySource: 'stripe',
      waitingFor: 'webhook',
      reason: 'payment_intent_ready_for_confirmation',
    });

    await mockOrderRepo.updatePaymentTransactionId(order.id, 'pi_concurrent_123');

    const stripePi = {
      id: 'pi_concurrent_123',
      status: 'succeeded',
      metadata: { orderId: order.id, fencingToken: order.metadata?.fencingToken?.toString() },
      charges: { data: [] },
    };

    // Run both concurrently
    const [p1, p2] = await Promise.all([
      service.finalizeOrderPayment('pi_concurrent_123', stripePi, 'user'),
      service.finalizeOrderPayment('pi_concurrent_123', stripePi, 'stripe-webhook'),
    ]);

    expect(p1.status).toBe('processing');
    expect(p2.status).toBe('processing');
    expect(db.orders.get(order.id)!.status).toBe('processing');
    expect(db.orders.get(order.id)!.paymentState).toBe('paid');
  });

  // 5. Cleanup Overlap
  it('5. should reject cleanup restoration when late Stripe succeeded webhook races with rollback', async () => {
    const address = { street: '123 St', city: 'City', state: 'ST', zip: '12345', country: 'US' };
    const key = 'attempt-cleanup-race';
    const order = await service.initiateCheckout('u1', address as any, 'u1@ex.com', 'User', undefined, key);

    await mockOrderRepo.transitionCheckoutAttemptPhase({
      attemptId: key,
      expectedPhases: ['INITIALIZE_ORDER'],
      nextPhase: 'CREATE_OR_RESUME_PAYMENT_INTENT',
      authoritySource: 'local',
      waitingFor: 'none',
      reason: 'payment_intent_created_by_processor',
    });
    await mockOrderRepo.transitionCheckoutAttemptPhase({
      attemptId: key,
      expectedPhases: ['CREATE_OR_RESUME_PAYMENT_INTENT'],
      nextPhase: 'AWAIT_PAYMENT_CONFIRMATION',
      authoritySource: 'stripe',
      waitingFor: 'webhook',
      reason: 'payment_intent_ready_for_confirmation',
    });

    await mockOrderRepo.updatePaymentTransactionId(order.id, 'pi_race_cleanup');

    const stripePi = {
      id: 'pi_race_cleanup',
      status: 'succeeded',
      metadata: { orderId: order.id, fencingToken: order.metadata?.fencingToken?.toString() },
      charges: { data: [] },
    };

    const pFinalize = service.finalizeOrderPayment('pi_race_cleanup', stripePi, 'stripe-webhook');
    const pRollback = service.rollbackUnpaidCheckout(order.id, key, 'pi_race_cleanup', 'expired_cleanup');

    await Promise.allSettled([pFinalize, pRollback]);

    const orderState = db.orders.get(order.id)!;
    expect(orderState.status).not.toBe('cancelled');
    expect(orderState.paymentState).toBe('paid');

    const attemptState = db.checkoutAttempts.get(key)!;
    expect(['paid', 'reconciling']).toContain(attemptState.state);
  });

  // 6. Delayed Reconciliation Retry
  it('6. should deduplicate and handle delayed reconciliation case reprocessing safely', async () => {
    await mockOrderRepo.createOrUpdateReconciliationCase({
      paymentIntentId: 'pi_recon_retry',
      orderId: 'order-recon-retry',
      checkoutAttemptId: 'attempt-recon-retry',
      reason: 'paid_not_finalized',
      severity: 'critical',
      stripeStatus: 'succeeded',
      operatorVisibleMessage: 'Payment succeeded but finalization did not complete.',
    });

    const orderData: any = {
      id: 'order-recon-retry',
      userId: 'u1',
      items: [{ productId: 'p1', quantity: 1, unitPrice: 1000, name: 'P1', fulfilledQty: 0, at: new Date() } as any],
      shippingAmount: 0,
      taxAmount: 0,
      discountAmount: 0,
      total: 1000,
      status: 'pending',
      paymentState: 'unpaid',
      fulfillmentState: 'unfulfilled',
      reconciliationState: 'needs_review',
      shippingAddress: { street: '123 St', city: 'City', state: 'ST', zip: '12345', country: 'US' },
      idempotencyKey: 'attempt-recon-retry',
      paymentTransactionId: 'pi_recon_retry',
      fulfillmentMethod: 'shipping', // Explicit shipping to resolve to 'processing'
      metadata: { inventoryReserved: true, fencingToken: 8, checkoutAttemptId: 'attempt-recon-retry' },
    };
    await mockOrderRepo.create(orderData);

    await mockOrderRepo.recordCheckoutAttempt({
      id: 'attempt-recon-retry',
      idempotencyKey: 'attempt-recon-retry',
      userId: 'u1',
      orderId: 'order-recon-retry',
      cartId: 'u1',
      cartOwnerId: 'order-recon-retry',
      fencingToken: 8,
      state: 'payment_intent_created',
      paymentIntentId: 'pi_recon_retry',
      currentPhase: 'AWAIT_PAYMENT_CONFIRMATION',
      authoritySource: 'local',
      waitingFor: 'webhook',
    });

    const stripePi = {
      id: 'pi_recon_retry',
      status: 'succeeded',
      metadata: { orderId: 'order-recon-retry', fencingToken: '8' },
      charges: { data: [] },
    };

    const result = await service.finalizeOrderPayment('pi_recon_retry', stripePi, 'operator');
    expect(result.status).toBe('processing');
    expect(result.paymentState).toBe('paid');

    const finalOrder = db.orders.get('order-recon-retry')!;
    expect(finalOrder.reconciliationState).toBe('none');
  });

  // 7. Stale Fencing Token Execution
  it('7. should reject executions with a stale fencing token and redirect to reconciliation', async () => {
    const address = { street: '123 St', city: 'City', state: 'ST', zip: '12345', country: 'US' };
    const key = 'attempt-fencing-stale';
    const order = await service.initiateCheckout('u1', address as any, 'u1@ex.com', 'User', undefined, key);

    await mockOrderRepo.transitionCheckoutAttemptPhase({
      attemptId: key,
      expectedPhases: ['INITIALIZE_ORDER'],
      nextPhase: 'CREATE_OR_RESUME_PAYMENT_INTENT',
      authoritySource: 'local',
      waitingFor: 'none',
      reason: 'payment_intent_created_by_processor',
    });
    await mockOrderRepo.transitionCheckoutAttemptPhase({
      attemptId: key,
      expectedPhases: ['CREATE_OR_RESUME_PAYMENT_INTENT'],
      nextPhase: 'AWAIT_PAYMENT_CONFIRMATION',
      authoritySource: 'stripe',
      waitingFor: 'webhook',
      reason: 'payment_intent_ready_for_confirmation',
    });

    await mockOrderRepo.updatePaymentTransactionId(order.id, 'pi_stale_fence');

    // Present token '1' when current database order token has advanced to e.g. '2' or higher
    const stripePi = {
      id: 'pi_stale_fence',
      status: 'succeeded',
      metadata: { orderId: order.id, fencingToken: '1' }, // Stale token!
      charges: { data: [] },
    };

    const result = await service.finalizeOrderPayment('pi_stale_fence', stripePi, 'stripe-webhook');
    expect(result.status).toBe('reconciling');

    const reconCase = db.reconciliationCases.get('pi_stale_fence')!;
    expect(reconCase).toBeDefined();
    expect(reconCase.reason).toBe('fencing_token_mismatch');
  });

  // 8. Transaction Retry Overlap
  it('8. should reject overlapping checkout attempts under same idempotency key and return existing state', async () => {
    const address = { street: '123 St', city: 'City', state: 'ST', zip: '12345', country: 'US' };
    const key = 'attempt-overlap-key';

    // First checkout starts and finishes initialization
    const r1 = await service.initiateCheckout('u1', address as any, 'u1@ex.com', 'User', undefined, key);
    
    // Simulate sequential retry under same key
    const r2 = await service.initiateCheckout('u1', address as any, 'u1@ex.com', 'User', undefined, key);

    expect(r1.id).toBe(r2.id);
    expect(mockOrderRepo.create).toHaveBeenCalledTimes(1); // Ensure idempotency at creation layer
  });

  // 9. Partial Rollback Failure
  it('9. should converge safely on subsequent retries when a rollback initially fails partially', async () => {
    const address = { street: '123 St', city: 'City', state: 'ST', zip: '12345', country: 'US' };
    const key = 'attempt-fail-rollback';
    // Do NOT pass paymentMethodId to keep it in pending status
    const order = await service.initiateCheckout('u1', address as any, 'u1@ex.com', 'User', undefined, key);

    // Make database update fail on first try
    mockOrderRepo.guardedUpdateStatus.mockImplementationOnce(async () => {
      throw new Error('Database connection reset');
    });

    await expect(service.rollbackUnpaidCheckout(order.id, key, 'pi_fail_rollback', 'expired_cleanup')).rejects.toThrow();

    // Verify it remains pending (partial rollback state)
    expect(db.orders.get(order.id)!.status).toBe('pending');

    // Retry rollback successfully
    await service.rollbackUnpaidCheckout(order.id, key, 'pi_fail_rollback', 'expired_cleanup');
    expect(db.orders.get(order.id)!.status).toBe('cancelled');
    expect(db.checkoutAttempts.get(key)!.state).toBe('restored');
  });

  // 10. Restore + Cleanup Overlap
  it('10. should block cart restoration during rollback if the user has already loaded a new cart', async () => {
    const address = { street: '123 St', city: 'City', state: 'ST', zip: '12345', country: 'US' };
    const key = 'attempt-restore-overlap';
    const order = await service.initiateCheckout('u1', address as any, 'u1@ex.com', 'User', undefined, key);

    // Prior to rollback executing, user adds a new item to cart
    db.carts.set('u1', {
      id: 'u1',
      userId: 'u1',
      items: [{ productId: 'p2', quantity: 2, priceSnapshot: 500, name: 'P2', imageUrl: '/p2.png', isDigital: false }],
      updatedAt: new Date(),
    });

    await service.rollbackUnpaidCheckout(order.id, key, 'pi_restore_overlap', 'expired_cleanup');

    const attempt = db.checkoutAttempts.get(key)!;
    expect(attempt.state).toBe('restore_blocked'); // Correctly fenced!
    expect(db.carts.get('u1')!.items[0].productId).toBe('p2'); // Cart not overwritten
  });

  // 11. Operator Reconciliation Resolution Racing with Late Stripe Success
  it('11. should allow safe operator reconciliation resolution racing with Stripe success', async () => {
    const orderData: any = {
      id: 'order-race-op',
      userId: 'u1',
      items: [{ productId: 'p1', quantity: 1, unitPrice: 1000, name: 'P1', fulfilledQty: 0, at: new Date() } as any],
      shippingAmount: 0,
      taxAmount: 0,
      discountAmount: 0,
      total: 1000,
      status: 'confirmed',
      paymentState: 'paid',
      fulfillmentState: 'processing',
      reconciliationState: 'none',
      shippingAddress: { street: '123 St', city: 'City', state: 'ST', zip: '12345', country: 'US' },
      idempotencyKey: 'attempt-race-op',
      paymentTransactionId: 'pi_race_op',
      metadata: { inventoryReserved: true, fencingToken: 12, checkoutAttemptId: 'attempt-race-op' },
    };
    await mockOrderRepo.create(orderData);

    const stripePi = {
      id: 'pi_race_op',
      status: 'succeeded',
      metadata: { orderId: 'order-race-op', fencingToken: '12' },
      charges: { data: [] },
    };

    const result = await service.finalizeOrderPayment('pi_race_op', stripePi, 'stripe-webhook');
    expect(result.status).toBe('confirmed');
    expect(result.paymentState).toBe('paid');
    expect(mockOrderRepo.transitionPaymentState).not.toHaveBeenCalled();
  });

  // 12. Verification of Forensic Tooling
  it('12. should compile chronological transition streams and correlate multi-domain state correctly', async () => {
    const attempt: Partial<CheckoutAttempt> = {
      id: 'attempt-forensics-1',
      orderId: 'order-forensics-1',
      paymentIntentId: 'pi_forensics_1',
      fencingToken: 100,
      state: 'reconciling',
      phaseTransitionEvidence: [{ type: 'stripe_event', value: 'succeeded', recordedAt: new Date().toISOString() }],
    };

    (attempt as any).phaseTransitions = {
      '1716300000000': {
        previousPhase: 'preparing',
        previousWorkflowPhase: 'PREPARE_CHECKOUT',
        nextPhase: 'reservation_acquired',
        nextWorkflowPhase: 'ACQUIRE_RESERVATION',
        authoritySource: 'local',
        actor: 'user',
        reason: 'checkout_initiated',
        transitionedAt: '2026-05-21T00:00:00.000Z',
      },
      '1716300060000': {
        previousPhase: 'reservation_acquired',
        previousWorkflowPhase: 'ACQUIRE_RESERVATION',
        nextPhase: 'reconciliation_required',
        nextWorkflowPhase: 'RECOVER_OR_RECONCILE',
        authoritySource: 'operator',
        actor: 'stripe-webhook',
        reason: 'fencing_token_mismatch',
        transitionedAt: '2026-05-21T00:01:00.000Z',
      },
    };

    const order: Partial<Order> = {
      id: 'order-forensics-1',
      status: 'reconciling',
      paymentState: 'paid',
      metadata: { fencingToken: 99 },
    };

    const reconCase: Partial<PaymentReconciliationCase> = {
      paymentIntentId: 'pi_forensics_1',
      orderId: 'order-forensics-1',
      checkoutAttemptId: 'attempt-forensics-1',
      reason: 'fencing_token_mismatch',
      severity: 'critical',
      lifecycleState: 'open',
      stripeStatus: 'succeeded',
      operatorVisibleMessage: 'Fencing token mismatch detected.',
      nextAction: 'Operator review needed.',
      recommendedAction: 'Resolve with Stripe evidence.',
      details: { attemptToken: 100, orderToken: 99 },
    };

    const timeline = reconstructTimeline(attempt);
    expect(timeline.length).toBe(2);
    expect(timeline[0].nextWorkflowPhase).toBe('ACQUIRE_RESERVATION');
    expect(timeline[1].nextWorkflowPhase).toBe('RECOVER_OR_RECONCILE');

    const rendered = renderTransitionStream(timeline);
    expect(rendered).toContain('Checkout Transition Timeline Stream');
    expect(rendered).toContain('fencing_token_mismatch');

    const correlation = correlateGroupedEvents(attempt, order, reconCase);
    expectFencingConflictDiagnostics(correlation);

    const summary = generateReconciliationEvidenceSummary(reconCase);
    expect(summary).toContain('Reconciliation Case: `fencing_token_mismatch`');
    expect(summary).toContain('Diagnostic Context Details');

    const diagnostics = runAuthoritativeDiagnostics(attempt, order, reconCase);
    expect(diagnostics.healthy).toBe(false);
    expect(diagnostics.recommendations.some(r => r.includes('Fencing token mismatch indicates concurrent scheduling'))).toBe(true);
  });
});
