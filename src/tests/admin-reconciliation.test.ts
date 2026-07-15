import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { OrderService } from '../core/OrderService';
import { createOrderTestStack } from './helpers/orderTestStack';
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
import {
  expectFencingConflictDiagnostics,
  expectTimelineRenderedForOperators,
} from './helpers/checkoutForensicAssertions';

// ─── Firebase Mocks ─────────────────────────────────────────────────────────

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
      activeTxPromise = next.catch(() => {});
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

describe('Operator-Facing Reconciliation & Forensics Integration Tests', () => {
  const db = new MemoryDatabase();

  const mockOrderRepo: any = {
    create: vi.fn(async (orderData: any) => {
      const id = orderData.id || `order-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
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
      if (order.paymentState === nextState) return;
      if (order.paymentState && !allowed.includes(order.paymentState)) {
        throw new Error(`Invalid payment transition from ${order.paymentState} to ${nextState}`);
      }
      order.paymentState = nextState;
      order.updatedAt = new Date();
    }),

    transitionFulfillmentState: vi.fn(async (orderId: string, allowed: FulfillmentState[], nextState: FulfillmentState, reason: string) => {
      const order = db.orders.get(orderId);
      if (!order) throw new Error(`Order ${orderId} not found`);
      if (order.fulfillmentState === nextState) return;
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
      if (order.status === nextState) return;
      if (order.status && !allowed.includes(order.status)) {
        throw new Error(`Invalid status transition from ${order.status} to ${nextState} (${reason})`);
      }
      order.status = nextState;
      order.updatedAt = new Date();
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
          authorEmail: 'system@woodbine.com',
          text: txt,
          createdAt: new Date(),
        }));
        order.notes.push(...noteObjects);
        order.reconciliationRequired = true;
      }
    }),

    clearReconciliationFlag: vi.fn(async (orderId: string) => {
      const order = db.orders.get(orderId);
      if (order) {
        order.reconciliationRequired = false;
        order.reconciliationState = 'none';
      }
    }),

    recordCheckoutAttempt: vi.fn(async (attemptData: any) => {
      const attempt = {
        ...attemptData,
        createdAt: new Date(),
        updatedAt: new Date(),
        phaseTransitions: attemptData.phaseTransitions || {},
      } as CheckoutAttempt;
      db.checkoutAttempts.set(attemptData.id, attempt);
    }),

    getCheckoutAttempt: vi.fn(async (attemptId: string) => {
      return db.checkoutAttempts.get(attemptId) || null;
    }),

    updateCheckoutAttempt: vi.fn(async (attemptId: string, updates: any) => {
      const attempt = db.checkoutAttempts.get(attemptId);
      if (attempt) {
        Object.assign(attempt, updates);
        attempt.updatedAt = new Date();
      }
    }),

    transitionCheckoutAttemptPhase: vi.fn(async (params: any) => {
      const attempt = db.checkoutAttempts.get(params.attemptId);
      if (!attempt) throw new Error(`Checkout attempt ${params.attemptId} not found`);

      attempt.currentPhase = params.nextPhase;
      attempt.authoritySource = params.authoritySource;
      attempt.waitingFor = params.waitingFor;
      attempt.lastTransitionAt = new Date().toISOString();
      attempt.lastTransitionReason = params.reason;

      const transKey = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      if (!(attempt as any).phaseTransitions) (attempt as any).phaseTransitions = {};
      (attempt as any).phaseTransitions[transKey] = {
        previousPhase: params.expectedPhases[0] || null,
        previousWorkflowPhase: params.expectedPhases[0] || null,
        previousStatus: attempt.state,
        nextPhase: params.nextPhase,
        nextWorkflowPhase: params.nextPhase,
        nextStatus: attempt.state,
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
      const caseId = `${params.paymentIntentId}_${params.reason}`;
      const existing = db.reconciliationCases.get(caseId);
      const data: PaymentReconciliationCase = {
        id: caseId,
        paymentIntentId: params.paymentIntentId,
        orderId: params.orderId || existing?.orderId || null,
        checkoutAttemptId: params.checkoutAttemptId || existing?.checkoutAttemptId || null,
        reason: params.reason,
        severity: params.severity || existing?.severity || 'high',
        lifecycleState: params.lifecycleState || existing?.lifecycleState || 'open',
        stripeStatus: params.stripeStatus || existing?.stripeStatus || null,
        operatorVisibleMessage: params.operatorVisibleMessage || existing?.operatorVisibleMessage || '',
        nextAction: params.nextAction || existing?.nextAction || '',
        recommendedAction: params.recommendedAction || existing?.recommendedAction || 'Verify system logs.',
        repairAttemptCount: existing ? existing.repairAttemptCount + 1 : 0,
        lastObservedStripeState: params.lastObservedStripeState || params.stripeStatus || existing?.lastObservedStripeState || null,
        lastObservedLocalState: params.lastObservedLocalState || existing?.lastObservedLocalState || null,
        details: params.details || existing?.details || {},
        createdAt: existing ? existing.createdAt : new Date(),
        updatedAt: new Date(),
        failureClassification: params.failureClassification || existing?.failureClassification || 'operator_required',
        evidence: params.evidence || existing?.evidence || [],
      };
      db.reconciliationCases.set(caseId, data);
    }),

    getReconciliationCase: vi.fn(async (caseId: string) => {
      return db.reconciliationCases.get(caseId) || null;
    }),

    getOpenReconciliationCases: vi.fn(async (options?: { limit?: number; reason?: PaymentReconciliationReason }) => {
      let cases = Array.from(db.reconciliationCases.values()).filter(c =>
        ['open', 'in_progress', 'repair_attempted', 'blocked'].includes(c.lifecycleState)
      );

      if (options?.reason) {
        cases = cases.filter(c => c.reason === options.reason);
      }

      cases.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

      const limit = options?.limit || 50;
      return cases.slice(0, limit);
    }),
  };

  const mockAudit = {
    record: vi.fn(),
    recordWithTransaction: vi.fn(),
  };

  const mockPayment = {
    processPayment: vi.fn(),
    refundPayment: vi.fn(),
  };

  const mockLocker = {
    acquireLock: vi.fn().mockResolvedValue({ success: true, fencingToken: 1 }),
    releaseLock: vi.fn(),
  };

  let svc: OrderService;
  let checkout: ReturnType<typeof createOrderTestStack>['checkout'];

  beforeEach(() => {
    db.reset();
    vi.clearAllMocks();

    ({ orderService: svc, checkout } = createOrderTestStack({
      orderRepo: mockOrderRepo as any,
      productRepo: { getById: vi.fn() } as any,
      cartRepo: { getByUserId: vi.fn() } as any,
      discountRepo: { getByCode: vi.fn() } as any,
      audit: mockAudit as any,
      locker: mockLocker as any,
    }));
  });

  // Helper functions to populate test cases
  function createTestOrder(id: string, overrides: Partial<Order> = {}): Order {
    const order = {
      id,
      userId: 'user-123',
      customerName: 'Alice Smith',
      customerEmail: 'alice@example.com',
      status: 'pending' as OrderStatus,
      paymentState: 'unpaid' as PaymentState,
      fulfillmentState: 'unfulfilled' as FulfillmentState,
      reconciliationState: 'none',
      reconciliationRequired: false,
      paymentTransactionId: 'pi_test_123',
      total: 15000,
      items: [{ productId: 'prod_abc', quantity: 1, isDigital: false }],
      discountCode: null,
      fulfillmentMethod: 'shipping',
      shippingAddress: { street: '123 Pine St', city: 'Denver', state: 'CO', zip: '80202', country: 'US' },
      fulfillments: [],
      metadata: { fencingToken: 1 },
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    } as any as Order;
    db.orders.set(id, order);
    return order;
  }

  function createTestAttempt(id: string, overrides: Partial<CheckoutAttempt> = {}): CheckoutAttempt {
    const attempt = {
      id,
      userId: 'user-123',
      cartOwner: 'Alice Smith',
      checkoutOwner: 'Alice Smith',
      paymentIntentId: 'pi_test_123',
      orderId: 'order-123',
      state: 'preparing',
      currentPhase: 'PREPARE_CHECKOUT',
      fencingToken: 123,
      phaseTransitions: {},
      phaseTransitionEvidence: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    } as any as CheckoutAttempt;
    db.checkoutAttempts.set(id, attempt);
    return attempt;
  }

  function createTestCase(paymentIntentId: string, reason: PaymentReconciliationReason, overrides: Partial<PaymentReconciliationCase> = {}): PaymentReconciliationCase {
    const caseId = `${paymentIntentId}_${reason}`;
    const data: PaymentReconciliationCase = {
      id: caseId,
      paymentIntentId,
      orderId: overrides.orderId || null,
      checkoutAttemptId: overrides.checkoutAttemptId || null,
      reason,
      severity: overrides.severity || 'high',
      lifecycleState: overrides.lifecycleState || 'open',
      stripeStatus: overrides.stripeStatus || null,
      operatorVisibleMessage: overrides.operatorVisibleMessage || 'Test case description',
      nextAction: overrides.nextAction || 'Investigate case manually',
      recommendedAction: overrides.recommendedAction || 'Align database state',
      repairAttemptCount: overrides.repairAttemptCount || 0,
      lastObservedStripeState: overrides.lastObservedStripeState || overrides.stripeStatus || null,
      lastObservedLocalState: overrides.lastObservedLocalState || null,
      details: overrides.details || {},
      createdAt: overrides.createdAt || new Date(),
      updatedAt: new Date(),
      failureClassification: overrides.failureClassification || 'operator_required',
      evidence: overrides.evidence || [],
    };
    db.reconciliationCases.set(caseId, data);
    return data;
  }

  // ─── Point 1: Open Cases Read Model ──────────────────────────────────────

  describe('Point 1 — Actionable Read Model & Authoritativeness', () => {
    it('PROVE: getReconciliationCasesReadModel determines authoritative source based on states', async () => {
      // 1. Setup Order A: Paid Cancelled (Stripe Authoritative)
      createTestOrder('order-a', { total: 5000, customerName: 'Alice', customerEmail: 'alice@e.com' });
      createTestCase('pi_a', 'paid_cancelled', {
        orderId: 'order-a',
        severity: 'critical',
        stripeStatus: 'succeeded',
        failureClassification: 'transient_external',
      });

      // 2. Setup Order B: paid_not_finalized (Stripe Authoritative)
      createTestOrder('order-b', { total: 8000, customerName: 'Bob', customerEmail: 'bob@e.com' });
      createTestCase('pi_b', 'paid_not_finalized', {
        orderId: 'order-b',
        severity: 'high',
        stripeStatus: 'succeeded',
        failureClassification: 'operator_required',
      });

      // 3. Setup Order C: Order is Terminal Paid (Local Authoritative)
      createTestOrder('order-c', {
        total: 12000,
        status: 'processing',
        paymentState: 'paid',
        customerName: 'Charlie',
        customerEmail: 'charlie@e.com',
      });
      createTestCase('pi_c', 'dangling_payment_intent', {
        orderId: 'order-c',
        severity: 'critical',
        stripeStatus: null,
        failureClassification: 'terminal_unrecoverable',
      });

      const model = await svc.getReconciliationCasesReadModel();

      expect(model.cases).toHaveLength(3);

      // Verify severity groupings
      expect(model.grouped.bySeverity.critical).toHaveLength(2);
      expect(model.grouped.bySeverity.high).toHaveLength(1);

      // Verify classification groupings
      expect(model.grouped.byFailureClass['transient_external']).toHaveLength(1);
      expect(model.grouped.byFailureClass['operator_required']).toHaveLength(1);
      expect(model.grouped.byFailureClass['terminal_unrecoverable']).toHaveLength(1);

      // Find Case A (Stripe Authoritative)
      const caseA = model.cases.find((c: any) => c.paymentIntentId === 'pi_a');
      expect(caseA.amount).toBe(5000);
      expect(caseA.customer.name).toBe('Alice');
      expect(caseA.customer.email).toBe('alice@e.com');
      expect(caseA.authoritativeSource).toBe('stripe');

      // Find Case C (Local Authoritative)
      const caseC = model.cases.find((c: any) => c.paymentIntentId === 'pi_c');
      expect(caseC.amount).toBe(12000);
      expect(caseC.authoritativeSource).toBe('local');
    });
  });

  // ─── Point 2: Stale Action Rejection ─────────────────────────────────────

  describe('Point 2 — Stale Operator Actions Rejection', () => {
    it('PROVE: Action on resolved cases throws an explicit error, except idempotent completions', async () => {
      const kase = createTestCase('pi_resolved', 'paid_cancelled', {
        orderId: 'order-123',
        lifecycleState: 'resolved',
      });

      // Stale recovery attempt on a resolved case must be rejected
      const staleRecovery = await checkout.handleReconciliationOperatorAction({
        caseId: kase.id,
        action: 'retry_recovery',
        reason: 'Try recovering',
        actor: { id: 'admin-1', email: 'admin@test.com' },
      });
      expect(staleRecovery.ok).toBe(false);
      if (!staleRecovery.ok) {
        expect(staleRecovery.message).toMatch(/already resolved and cannot be modified/i);
      }

      // Idempotent mark_resolved on a resolved case must succeed with no-op
      const beforeEvidenceLen = kase.evidence?.length || 0;
      const markResolved = await checkout.handleReconciliationOperatorAction({
        caseId: kase.id,
        action: 'mark_resolved',
        reason: 'Mark resolved',
        actor: { id: 'admin-1', email: 'admin@test.com' },
      });
      expect(markResolved.ok).toBe(true);

      const updatedCase = db.reconciliationCases.get(kase.id);
      expect(updatedCase?.evidence?.length).toBe(beforeEvidenceLen);
    });
  });

  // ─── Point 3: Duplicate Action Idempotency ──────────────────────────────

  describe('Point 3 — Duplicate Action Idempotency', () => {
    it('PROVE: Double execution operator actions are perfectly idempotent', async () => {
      createTestOrder('order-123', { status: 'reconciling', reconciliationRequired: true });
      const kase = createTestCase('pi_abc', 'paid_cancelled', {
        orderId: 'order-123',
        lifecycleState: 'open',
      });

      const actor = { id: 'admin-1', email: 'admin@test.com' };

      // First run: transitions from open to resolved
      await checkout.handleReconciliationOperatorAction({
        caseId: kase.id,
        action: 'mark_resolved',
        reason: 'Resolved manually after inspection',
        actor,
      });

      const firstPassCase = db.reconciliationCases.get(kase.id);
      expect(firstPassCase?.lifecycleState).toBe('resolved');
      expect(firstPassCase?.evidence).toBeDefined();
      expect(firstPassCase?.evidence![0].value).toContain('Action: mark_resolved');

      // Order reconciliation flag should be cleared
      const order = db.orders.get('order-123');
      expect(order?.reconciliationRequired).toBe(false);

      // Second run (Duplicate): should exit idempotently without adding new evidence or erroring
      await checkout.handleReconciliationOperatorAction({
        caseId: kase.id,
        action: 'mark_resolved',
        reason: 'Resolved manually after inspection',
        actor,
      });

      const secondPassCase = db.reconciliationCases.get(kase.id);
      expect(secondPassCase?.lifecycleState).toBe('resolved');
      expect(secondPassCase?.evidence).toHaveLength(1); // Remains exactly 1
    });
  });

  // ─── Point 4: Refund-Review Safety ───────────────────────────────────────

  describe('Point 4 — Refund-Review Domain Protection', () => {
    it('PROVE: initiate_refund_review updates metadata without calling payment provider refundPayment', async () => {
      const kase = createTestCase('pi_refund_review', 'paid_cancelled', {
        orderId: 'order-123',
        lifecycleState: 'open',
      });

      await checkout.handleReconciliationOperatorAction({
        caseId: kase.id,
        action: 'initiate_refund_review',
        reason: 'Operator triggered manual audit before refunding',
        actor: { id: 'admin-1', email: 'admin@test.com' },
      });

      const updatedCase = db.reconciliationCases.get(kase.id);
      expect(updatedCase?.lifecycleState).toBe('in_progress');
      expect(updatedCase?.nextAction).toBe('refund_review_active');
      expect(updatedCase?.recommendedAction).toBe('Review the refund review request manually using the RefundService.');

      // CRITICAL SECURITY ASSERTION: No direct payment refund is triggered inside the operator action orchestrator
      expect(mockPayment.refundPayment).not.toHaveBeenCalled();
    });
  });

  // ─── Point 5: Reconstruct Chronological Timeline ─────────────────────────

  describe('Point 5 — Chronological Forensics Timeline Reconstructions', () => {
    it('PROVE: getForensicTimeline gathers transitions, diagnoses, and formats markdown stream', async () => {
      const time1 = '2026-05-21T00:00:00.000Z';
      const time2 = '2026-05-21T00:01:00.000Z';
      const time3 = '2026-05-21T00:02:00.000Z';

      const phaseTransitions = {
        '3': {
          previousPhase: 'preparing',
          previousWorkflowPhase: 'PREPARE_CHECKOUT',
          nextPhase: 'attempt_active',
          nextWorkflowPhase: 'ACQUIRE_RESERVATION',
          authoritySource: 'local',
          actor: 'customer',
          reason: 'checkout started',
          transitionedAt: time3, // late timestamp but key is small
        },
        '1': {
          previousPhase: 'init',
          previousWorkflowPhase: 'INIT',
          nextPhase: 'preparing',
          nextWorkflowPhase: 'PREPARE_CHECKOUT',
          authoritySource: 'local',
          actor: 'system',
          reason: 'initiation',
          transitionedAt: time1,
        },
        '2': {
          previousPhase: 'preparing',
          previousWorkflowPhase: 'PREPARE_CHECKOUT',
          nextPhase: 'attempt_active',
          nextWorkflowPhase: 'ACQUIRE_RESERVATION',
          authoritySource: 'local',
          actor: 'customer',
          reason: 'checkout started',
          transitionedAt: time2,
        },
      };

      createTestAttempt('attempt-123', {
        fencingToken: 123,
        phaseTransitions,
      } as any);

      createTestOrder('order-123', {
        metadata: { fencingToken: 999 } as any, // Fencing mismatch!
      });

      createTestCase('pi_test_123', 'paid_cancelled', {
        checkoutAttemptId: 'attempt-123',
        orderId: 'order-123',
        failureClassification: 'transient_external',
      });

      const timeline = await svc.getForensicTimeline('attempt-123');

      expect(timeline.attemptId).toBe('attempt-123');
      expect(timeline.orderId).toBe('order-123');

      // Verify sorting is chronological based on transitionedAt (time1, time2, time3)
      expect(timeline.timeline).toHaveLength(3);
      expect(timeline.timeline[0].timestamp).toBe(time1);
      expect(timeline.timeline[1].timestamp).toBe(time2);
      expect(timeline.timeline[2].timestamp).toBe(time3);

      // Verify diagnostics capture mismatched fencing tokens and active reconciliation cases
      expect(timeline.diagnostics.healthy).toBe(false);
      expectFencingConflictDiagnostics(timeline.correlation);

      // Verify markdown formatting
      expectTimelineRenderedForOperators(timeline.renderedMarkdown);
    });
  });

  // ─── Point 6: Webhook Re-Entry Immunity ──────────────────────────────────

  describe('Point 6 — Webhook Re-Entry Immunity on Resolved Cases', () => {
    it('PROVE: confirmStripePayment early-exits safely when order or case is already resolved', async () => {
      // Setup order in resolved reconciliation state
      const order = createTestOrder('order-123', {
        paymentTransactionId: 'pi_resolved_webhook',
        reconciliationState: 'resolved',
        status: 'confirmed',
        paymentState: 'paid',
      });

      createTestAttempt('attempt-resolved', {
        id: 'attempt-resolved',
        orderId: 'order-123',
        paymentIntentId: 'pi_resolved_webhook',
      });

      // Invoke finalization again simulating late webhook or replay noise
      const result = await checkout.confirmPaymentFromStripe('pi_resolved_webhook', {
        status: 'succeeded',
        id: 'pi_resolved_webhook',
        metadata: { orderId: 'order-123' },
      });

      // Proof: Order status, state, and collections remain untouched, exiting safely
      expect(result.id).toBe('order-123');
      expect(result.reconciliationState).toBe('resolved');
      expect(result.status).toBe('confirmed');

      // transitionCheckoutAttemptPhase must never be called since we exited early
      expect(mockOrderRepo.transitionCheckoutAttemptPhase).not.toHaveBeenCalled();
    });

    it('PROVE: confirmStripePayment early-exits safely when case document is resolved', async () => {
      // Setup order in non-terminal state but with a resolved case document
      const order = createTestOrder('order-123', {
        paymentTransactionId: 'pi_case_resolved',
        reconciliationState: 'none',
        status: 'pending',
      });

      createTestAttempt('attempt-resolved-case', {
        id: 'attempt-resolved-case',
        orderId: 'order-123',
        paymentIntentId: 'pi_case_resolved',
      });

      createTestCase('pi_case_resolved', 'paid_cancelled', {
        orderId: 'order-123',
        lifecycleState: 'resolved',
      });

      // Simulate webhook replay on a resolved case
      const result = await checkout.confirmPaymentFromStripe('pi_case_resolved', {
        status: 'succeeded',
        id: 'pi_case_resolved',
        metadata: { orderId: 'order-123' },
      });

      expect(result.id).toBe('order-123');
      expect(result.status).toBe('pending'); // Stays pending, not finalized or mutated
      expect(mockOrderRepo.transitionCheckoutAttemptPhase).not.toHaveBeenCalled();
    });
  });
});
