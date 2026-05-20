import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OrderService } from '../core/OrderService';
import { RefundService } from '../core/RefundService';

const getPaymentIntent = vi.fn();

vi.mock('@infrastructure/services/StripeService', () => ({
  StripeService: vi.fn(() => ({ getPaymentIntent })),
}));

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
    recordRefund: vi.fn(),
    ...overrides,
  };
  repo.guardedUpdateStatus.mockImplementation(async (id: string, _allowed: string[], status: string, _reason: string, transaction?: any) => {
    await repo.updateStatus(id, status, transaction);
  });
  repo.transitionPaymentState.mockResolvedValue(undefined);
  repo.transitionFulfillmentState.mockResolvedValue(undefined);
  repo.transitionReconciliationState.mockResolvedValue(undefined);
  return repo;
}

function makeOrderService(orderRepo: any) {
  return new OrderService(
    orderRepo,
    { getById: vi.fn(), batchUpdateStock: vi.fn() } as any,
    { getByUserId: vi.fn(), clear: vi.fn() } as any,
    { getByCode: vi.fn() } as any,
    { processPayment: vi.fn(), refundPayment: vi.fn() } as any,
    { record: vi.fn(), recordWithTransaction: vi.fn() } as any,
    { acquireLock: vi.fn().mockResolvedValue({ success: true, fencingToken: 1 }), releaseLock: vi.fn() } as any,
  );
}

describe('financial recovery hardening', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('cleanup finalizes a succeeded Stripe PaymentIntent instead of cancelling the local order', async () => {
    const order = {
      id: 'order-paid-cleanup',
      userId: 'u1',
      status: 'pending',
      paymentTransactionId: 'pi_paid_cleanup',
      idempotencyKey: 'checkout-cleanup-paid',
      fulfillmentMethod: 'shipping',
      metadata: { inventoryReserved: true, fencingToken: 1, checkoutAttemptId: 'checkout-cleanup-paid' },
      items: [{ productId: 'p1', quantity: 1, isDigital: false }],
    };
    const orderRepo = makeOrderRepo({
      getAll: vi.fn().mockResolvedValue({ orders: [order] }),
      getByPaymentTransactionIdTransactional: vi.fn().mockResolvedValue(order),
    });
    getPaymentIntent.mockResolvedValue({
      id: 'pi_paid_cleanup',
      status: 'succeeded',
      metadata: { orderId: 'order-paid-cleanup', fencingToken: '1', checkoutKey: 'checkout-cleanup-paid' },
      charges: { data: [] },
    });

    const service = makeOrderService(orderRepo);
    const result = await service.cleanupExpiredOrders(60);

    expect(result.count).toBe(1);
    expect(orderRepo.transitionPaymentState).toHaveBeenCalledWith('order-paid-cleanup', ['unpaid', 'requires_payment_method', 'processing'], 'paid', 'payment_finalized', expect.anything());
    expect(orderRepo.guardedUpdateStatus).toHaveBeenCalledWith('order-paid-cleanup', ['pending'], 'processing', 'payment_finalized', expect.anything());
    expect(orderRepo.guardedUpdateStatus).not.toHaveBeenCalledWith('order-paid-cleanup', expect.anything(), 'cancelled', expect.anything(), expect.anything());
    expect(orderRepo.createOrUpdateReconciliationCase).not.toHaveBeenCalledWith(expect.objectContaining({ reason: 'paid_not_finalized' }));
  });

  it('cleanup does not cancel an expired order while Stripe PaymentIntent is still active', async () => {
    const order = {
      id: 'order-active-cleanup',
      userId: 'u1',
      status: 'pending',
      paymentTransactionId: 'pi_processing_cleanup',
      idempotencyKey: 'checkout-cleanup-active',
      metadata: { checkoutAttemptId: 'checkout-cleanup-active' },
      items: [],
    };
    const orderRepo = makeOrderRepo({
      getAll: vi.fn().mockResolvedValue({ orders: [order] }),
    });
    getPaymentIntent.mockResolvedValue({ id: 'pi_processing_cleanup', status: 'processing' });

    const service = makeOrderService(orderRepo);
    const result = await service.cleanupExpiredOrders(60);

    expect(result.count).toBe(0);
    expect(orderRepo.guardedUpdateStatus).not.toHaveBeenCalled();
    expect(orderRepo.createOrUpdateReconciliationCase).toHaveBeenCalledWith(expect.objectContaining({
      paymentIntentId: 'pi_processing_cleanup',
      orderId: 'order-active-cleanup',
      reason: 'paid_not_finalized',
      stripeStatus: 'processing',
    }));
  });

  it('refunds require caller-provided attempt ids for deterministic idempotency', async () => {
    const orderRepo = makeOrderRepo({
      getById: vi.fn().mockResolvedValue({
        id: 'order-refund',
        status: 'delivered',
        paymentTransactionId: 'pi_refund',
        total: 1000,
        refundedAmount: 0,
        items: [],
      }),
    });
    const refundService = new RefundService(
      orderRepo as any,
      { refundPayment: vi.fn() } as any,
      { record: vi.fn(), recordWithTransaction: vi.fn() } as any,
      undefined,
      undefined,
      { acquireLock: vi.fn().mockResolvedValue({ success: true, fencingToken: 1 }), releaseLock: vi.fn() } as any,
    );

    await expect(refundService.processRefund('order-refund', 1000, { id: 'admin', email: 'admin@example.com' }, '')).rejects.toThrow('refundAttemptId is required');
  });

  it('finalization records a durable mapping-mismatch reconciliation case', async () => {
    const orderRepo = makeOrderRepo({
      getByPaymentTransactionIdTransactional: vi.fn().mockResolvedValue(null),
      getById: vi.fn().mockResolvedValue({
        id: 'order-mismatch',
        userId: 'u1',
        status: 'pending',
        paymentTransactionId: 'pi_existing',
        metadata: { fencingToken: 1 },
        items: [],
      }),
    });
    const service = makeOrderService(orderRepo);

    await expect(service.finalizeOrderPayment('pi_webhook', {
      id: 'pi_webhook',
      status: 'succeeded',
      metadata: { orderId: 'order-mismatch', fencingToken: '1' },
      charges: { data: [] },
    })).rejects.toThrow(/different payment intent/i);

    expect(orderRepo.createOrUpdateReconciliationCase).toHaveBeenCalledWith(expect.objectContaining({
      paymentIntentId: 'pi_webhook',
      orderId: 'order-mismatch',
      reason: 'mapping_mismatch',
      severity: 'critical',
    }));
  });

  it('finalization records a durable dangling-payment-intent reconciliation case', async () => {
    const orderRepo = makeOrderRepo({
      getByPaymentTransactionIdTransactional: vi.fn().mockResolvedValue(null),
      getById: vi.fn().mockResolvedValue(null),
    });
    const service = makeOrderService(orderRepo);

    await expect(service.finalizeOrderPayment('pi_dangling', {
      id: 'pi_dangling',
      status: 'succeeded',
      metadata: { orderId: 'order-missing' },
      charges: { data: [] },
    })).rejects.toThrow();

    expect(orderRepo.createOrUpdateReconciliationCase).toHaveBeenCalledWith(expect.objectContaining({
      paymentIntentId: 'pi_dangling',
      orderId: 'order-missing',
      reason: 'dangling_payment_intent',
      severity: 'critical',
    }));
  });

  it('moves a paid cancelled order into reconciliation state instead of leaving it cancelled', async () => {
    const orderRepo = makeOrderRepo({
      getByPaymentTransactionIdTransactional: vi.fn().mockResolvedValue({
        id: 'order-paid-cancelled',
        userId: 'u1',
        status: 'cancelled',
        paymentTransactionId: 'pi_paid_cancelled',
        metadata: { inventoryReserved: true, inventoryReservationReleased: true },
        items: [{ productId: 'p1', quantity: 1, isDigital: false }],
      }),
    });
    const service = makeOrderService(orderRepo);

    const result = await service.finalizeOrderPayment('pi_paid_cancelled', {
      id: 'pi_paid_cancelled',
      status: 'succeeded',
      metadata: { orderId: 'order-paid-cancelled' },
      charges: { data: [] },
    });

    expect(result.status).toBe('reconciling');
    expect(orderRepo.transitionPaymentState).toHaveBeenCalledWith('order-paid-cancelled', ['unpaid', 'requires_payment_method', 'processing', 'failed', 'cancelled'], 'paid', 'stripe_succeeded_terminal_conflict', expect.anything());
    expect(orderRepo.transitionReconciliationState).toHaveBeenCalledWith('order-paid-cancelled', ['none', 'needs_review'], 'needs_review', 'paid_terminal_conflict', expect.anything());
    expect(orderRepo.guardedUpdateStatus).toHaveBeenCalledWith('order-paid-cancelled', ['cancelled', 'refunded'], 'reconciling', 'paid_terminal_conflict', expect.anything());
    expect(orderRepo.createOrUpdateReconciliationCase).toHaveBeenCalledWith(expect.objectContaining({
      paymentIntentId: 'pi_paid_cancelled',
      orderId: 'order-paid-cancelled',
      reason: 'paid_cancelled',
      severity: 'critical',
    }), expect.anything());
  });

  it('temporal chaos: verify finalization after cleanup cancellation repairs into paid reconciliation', async () => {
    const orderRepo = makeOrderRepo({
      getByPaymentTransactionIdTransactional: vi.fn().mockResolvedValue({
        id: 'order-chaos-cleanup',
        userId: 'u1',
        status: 'cancelled',
        paymentTransactionId: 'pi_chaos_success',
        metadata: { inventoryReserved: true, inventoryReservationReleased: true },
        items: [{ productId: 'p1', quantity: 1, isDigital: false }],
      }),
    });
    const service = makeOrderService(orderRepo);

    await service.finalizeOrderPayment('pi_chaos_success', {
      id: 'pi_chaos_success',
      status: 'succeeded',
      metadata: { orderId: 'order-chaos-cleanup' },
      charges: { data: [] },
    });

    expect(orderRepo.transitionPaymentState).toHaveBeenCalledWith('order-chaos-cleanup', expect.any(Array), 'paid', 'stripe_succeeded_terminal_conflict', expect.anything());
    expect(orderRepo.transitionReconciliationState).toHaveBeenCalledWith('order-chaos-cleanup', ['none', 'needs_review'], 'needs_review', 'paid_terminal_conflict', expect.anything());
    expect(orderRepo.createOrUpdateReconciliationCase).toHaveBeenCalledWith(expect.objectContaining({
      reason: 'paid_cancelled',
    }), expect.anything());
  });

  it('temporal chaos: finalization failure after Stripe success creates a repairable open case', async () => {
    const orderRepo = makeOrderRepo({
      getByPaymentTransactionIdTransactional: vi.fn().mockRejectedValue(new Error('transaction aborted after Stripe success')),
    });
    const service = makeOrderService(orderRepo);

    await expect(service.finalizeOrderPayment('pi_finalization_failure', {
      id: 'pi_finalization_failure',
      status: 'succeeded',
      metadata: { orderId: 'order-finalization-failure', checkoutKey: 'checkout-finalization-failure' },
      charges: { data: [] },
    })).rejects.toThrow('transaction aborted after Stripe success');

    expect(orderRepo.createOrUpdateReconciliationCase).toHaveBeenCalledWith(expect.objectContaining({
      paymentIntentId: 'pi_finalization_failure',
      orderId: 'order-finalization-failure',
      checkoutAttemptId: 'checkout-finalization-failure',
      reason: 'paid_not_finalized',
      severity: 'critical',
      stripeStatus: 'succeeded',
      nextAction: 'Retry finalization; if blocked, resolve from reconciliation with Stripe evidence.',
    }));
  });
});
