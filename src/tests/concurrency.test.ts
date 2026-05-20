import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OrderService } from '../core/OrderService';
import { CheckoutInProgressError, InsufficientStockError } from '@domain/errors';

// Mock the bridge
vi.mock('@infrastructure/firebase/bridge', () => ({
  runTransaction: vi.fn(async (db, fn) => {
    // Simulate a slow transaction to increase chance of overlap in tests
    const transaction = {
      get: vi.fn(),
      set: vi.fn(),
      update: vi.fn(),
      delete: vi.fn()
    };
    await new Promise(resolve => setTimeout(resolve, 50));
    return fn(transaction);
  }),
  getUnifiedDb: vi.fn(() => ({})),
}));

describe('OrderService Concurrency', () => {
  let orderService: OrderService;
  let mockOrderRepo: any;
  let mockProductRepo: any;
  let mockCartRepo: any;
  let mockDiscountRepo: any;
  let mockPayment: any;
  let mockAudit: any;
  let mockLocker: any;

  beforeEach(() => {
    mockOrderRepo = {
      create: vi.fn().mockImplementation(async (o) => ({ ...o, id: 'o1', createdAt: new Date(), updatedAt: new Date() })),
      save: vi.fn(),
      getById: vi.fn(),
      getByPaymentTransactionId: vi.fn(),
      getByPaymentTransactionIdTransactional: vi.fn(),
      getByIdempotencyKey: vi.fn().mockResolvedValue(null),
      recordCheckoutAttempt: vi.fn(),
      updateCheckoutAttempt: vi.fn(),
      createOrUpdateReconciliationCase: vi.fn(),
      transitionPaymentState: vi.fn().mockResolvedValue(undefined),
      transitionFulfillmentState: vi.fn().mockResolvedValue(undefined),
      transitionReconciliationState: vi.fn().mockResolvedValue(undefined),
      updateStatus: vi.fn().mockResolvedValue(undefined),
      guardedUpdateStatus: vi.fn().mockImplementation(async (_id, _allowed, status, _reason, transaction) => {
        return mockOrderRepo.updateStatus(_id, status, transaction);
      }),
      markForReconciliation: vi.fn(),
    };
    mockProductRepo = {
      getById: vi.fn().mockResolvedValue({ id: 'p1', price: 1000, stock: 1 }),
      batchUpdateStock: vi.fn(),
    };
    mockCartRepo = {
      getByUserId: vi.fn().mockResolvedValue({
        userId: 'u1',
        items: [{ productId: 'p1', quantity: 1, priceSnapshot: 1000, name: 'P1', imageUrl: '/p1.png' }]
      }),
      clear: vi.fn(),
    };
    mockDiscountRepo = {
      getByCode: vi.fn(),
      incrementUsage: vi.fn(),
    };
    mockPayment = {
      processPayment: vi.fn(),
    };
    mockAudit = {
      record: vi.fn(),
      recordWithTransaction: vi.fn(),
    };
    
    // Real-ish locker behavior (simple in-memory)
    const locks = new Set<string>();
    mockLocker = {
      acquireLock: vi.fn().mockImplementation(async (id: string) => {
        if (locks.has(id)) return false;
        locks.add(id);
        return true;
      }),
      releaseLock: vi.fn().mockImplementation(async (id: string) => {
        locks.delete(id);
      }),
    };

    orderService = new OrderService(
      mockOrderRepo,
      mockProductRepo,
      mockCartRepo,
      mockDiscountRepo,
      mockPayment,
      mockAudit,
      mockLocker,
      undefined,
      undefined
    );
  });

  it('should prevent concurrent checkouts for the same user via distributed lock', async () => {
    const address = { street: '123 St', city: 'City', state: 'ST', zip: '12345', country: 'US' };

    // Start two checkouts simultaneously
    const p1 = orderService.initiateCheckout('u1', address as any);
    const p2 = orderService.initiateCheckout('u1', address as any);

    const results = await Promise.allSettled([p1, p2]);

    const succeeded = results.filter(r => r.status === 'fulfilled');
    const failed = results.filter(r => r.status === 'rejected') as any[];

    expect(succeeded.length).toBe(1);
    expect(failed.length).toBe(1);
    expect(failed[0].reason).toBeInstanceOf(CheckoutInProgressError);
  });

  it('should handle idempotency correctly when distributed lock is released but request is retried', async () => {
    const address = { street: '123 St', city: 'City', state: 'ST', zip: '12345', country: 'US' };
    const idempotencyKey = 'unique-key-123';

    // First checkout succeeds
    await orderService.initiateCheckout('u1', address as any, 'user@example.com', 'User', undefined, idempotencyKey);
    
    // Mock repo to return the existing order for the same idempotency key
    mockOrderRepo.getByIdempotencyKey.mockResolvedValueOnce({ id: 'o1', userId: 'u1', status: 'pending' });

    // Release lock manually for the test
    await mockLocker.releaseLock(`checkout_lock:u1`);

    // Second checkout with same idempotency key
    const order2 = await orderService.initiateCheckout('u1', address as any, 'user@example.com', 'User', undefined, idempotencyKey);
    
    expect(order2.id).toBe('o1'); // Should be the same order
    expect(mockOrderRepo.create).toHaveBeenCalledTimes(1); // Should not have called create again if it was truly idempotent at the repo level
    // Note: The mock above is a bit simplified; real hardening is in FirestoreOrderRepository.
  });

  it('rejects idempotency key reuse across users', async () => {
    const address = { street: '123 St', city: 'City', state: 'ST', zip: '12345', country: 'US' };
    mockOrderRepo.getByIdempotencyKey.mockResolvedValueOnce({
      id: 'o-other-user',
      userId: 'other-user',
      status: 'pending',
      paymentTransactionId: null,
      idempotencyKey: 'shared-key'
    });

    await expect(orderService.initiateCheckout(
      'u1',
      address as any,
      'user@example.com',
      'User',
      undefined,
      'shared-key'
    )).rejects.toThrow('Checkout idempotency key is already associated with another user.');

    expect(mockOrderRepo.create).not.toHaveBeenCalled();
    expect(mockCartRepo.clear).not.toHaveBeenCalled();
  });

  it('allows only one buyer to reserve the last physical item', async () => {
    const address = { street: '123 St', city: 'City', state: 'ST', zip: '12345', country: 'US' };
    let stock = 1;
    mockCartRepo.getByUserId.mockImplementation(async (userId: string) => ({
      userId,
      items: [{ productId: 'p1', quantity: 1, priceSnapshot: 1000, name: 'P1', imageUrl: '/p1.png' }]
    }));
    mockProductRepo.batchUpdateStock.mockImplementation(async (updates: Array<{ delta: number }>) => {
      const nextStock = stock + updates.reduce((sum, update) => sum + update.delta, 0);
      if (nextStock < 0) throw new InsufficientStockError('p1', 1, stock);
      stock = nextStock;
    });

    const results = await Promise.allSettled([
      orderService.initiateCheckout('buyer-1', address as any),
      orderService.initiateCheckout('buyer-2', address as any),
    ]);

    expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter(result => result.status === 'rejected')).toHaveLength(1);
    expect(stock).toBe(0);
  });

  it('should resume payment processing and transition order status to confirmed on checkout retry of a pending order with no payment transaction id', async () => {
    const address = { street: '123 St', city: 'City', state: 'ST', zip: '12345', country: 'US' };
    const idempotencyKey = 'timed-out-key';

    // Mock existing order with status: pending and paymentTransactionId: null
    mockOrderRepo.getByIdempotencyKey.mockResolvedValueOnce({
      id: 'o-existing',
      userId: 'u1',
      total: 1000,
      status: 'pending',
      paymentTransactionId: null,
      idempotencyKey,
      fulfillmentMethod: 'shipping',
      metadata: { inventoryReserved: true },
      items: [{ productId: 'p1', quantity: 1, isDigital: false }]
    });

    mockPayment.processPayment.mockResolvedValueOnce({
      success: true,
      transactionId: 'tx-recovered'
    });

    mockOrderRepo.updateStatus = vi.fn();
    mockOrderRepo.updatePaymentTransactionId = vi.fn();
    mockOrderRepo.getByPaymentTransactionIdTransactional.mockResolvedValueOnce({
      id: 'o-existing',
      userId: 'u1',
      total: 1000,
      status: 'pending',
      paymentTransactionId: 'tx-recovered',
      idempotencyKey,
      fulfillmentMethod: 'shipping',
      metadata: { inventoryReserved: true },
      items: [{ productId: 'p1', quantity: 1, isDigital: false }]
    });
    mockOrderRepo.updateRiskScore = vi.fn();
    mockOrderRepo.updateMetadata = vi.fn();
    mockOrderRepo.addFulfillmentEvent = vi.fn();

    const order = await orderService.initiateCheckout(
      'u1',
      address as any,
      'user@example.com',
      'User',
      undefined,
      idempotencyKey,
      'pm_123'
    );

    // Verify order is returned
    expect(order.id).toBe('o-existing');
    // Verify status is fully finalized and paymentTransactionId is set in the returned order
    expect(order.status).toBe('processing');
    expect(order.paymentTransactionId).toBe('tx-recovered');

    // Verify repository update calls were made
    expect(mockOrderRepo.updatePaymentTransactionId).toHaveBeenCalledWith('o-existing', 'tx-recovered');
    expect(mockOrderRepo.updateStatus).toHaveBeenCalledWith('o-existing', 'processing', expect.anything());
    expect(mockPayment.processPayment).toHaveBeenCalledWith({
      amount: 1000,
      orderId: 'o-existing',
      paymentMethodId: 'pm_123',
      idempotencyKey: 'timed-out-key'
    });
    // Verify that we did not run the cart checkout / create transaction flow again
    expect(mockOrderRepo.create).not.toHaveBeenCalled();
  });

  it('should settle webhook instantly via fallback metadata query if synchronous transaction mapping is not yet written', async () => {
    const stripePi = {
      id: 'pi_race_123',
      status: 'succeeded',
      metadata: { orderId: 'order_123' },
      charges: { data: [{ outcome: { risk_score: 10 } }] }
    };

    // 1. Webhook query by Payment Transaction ID returns null due to the race
    mockOrderRepo.getByPaymentTransactionIdTransactional.mockResolvedValueOnce(null);

    // 2. Fallback direct point-read finds the order transactionally
    const mockOrder = {
      id: 'order_123',
      userId: 'u1',
      status: 'pending',
      paymentTransactionId: null,
      fulfillmentMethod: 'shipping',
      metadata: { inventoryReserved: true },
      items: [{ productId: 'p1', quantity: 2 }]
    };
    mockOrderRepo.getById.mockResolvedValue(mockOrder);

    mockOrderRepo.updatePaymentTransactionId = vi.fn();
    mockOrderRepo.updateStatus = vi.fn();
    mockOrderRepo.updateRiskScore = vi.fn();
    mockOrderRepo.updateMetadata = vi.fn();
    mockOrderRepo.addFulfillmentEvent = vi.fn();

    const result = await orderService.finalizeOrderPayment('pi_race_123', stripePi);

    // Assert fallback query succeeded
    expect(result.id).toBe('order_123');
    expect(result.status).toBe('processing');

    // Assert order repository mapping was updated transactionally
    expect(mockOrderRepo.updatePaymentTransactionId).toHaveBeenCalledWith('order_123', 'pi_race_123', expect.anything());
    expect(mockOrderRepo.updateStatus).toHaveBeenCalledWith('order_123', 'processing', expect.anything());
    expect(mockOrderRepo.updateMetadata).toHaveBeenCalledWith('order_123', {
      inventoryReserved: true,
      inventoryReservationFinalized: true
    }, expect.anything());
  });

  it('forces reconciliation when a succeeded payment arrives for a cancelled order', async () => {
    mockOrderRepo.getByPaymentTransactionIdTransactional.mockResolvedValueOnce({
      id: 'o-cancelled',
      userId: 'u1',
      status: 'cancelled',
      paymentTransactionId: 'pi_late_success',
      fulfillmentMethod: 'shipping',
      metadata: { inventoryReserved: true, inventoryReservationReleased: true },
      items: [{ productId: 'p1', quantity: 1, isDigital: false }]
    });
    mockOrderRepo.updateStatus = vi.fn().mockResolvedValue(undefined);
    mockOrderRepo.markForReconciliation = vi.fn().mockResolvedValue(undefined);

    const result = await orderService.finalizeOrderPayment('pi_late_success', {
      id: 'pi_late_success',
      status: 'succeeded',
      metadata: { orderId: 'o-cancelled' },
      charges: { data: [] }
    });

    expect(result.status).toBe('reconciling');
    expect(mockOrderRepo.transitionPaymentState).toHaveBeenCalledWith('o-cancelled', ['unpaid', 'requires_payment_method', 'processing', 'failed', 'cancelled'], 'paid', 'stripe_succeeded_terminal_conflict', expect.anything());
    expect(mockOrderRepo.transitionReconciliationState).toHaveBeenCalledWith('o-cancelled', ['none', 'needs_review'], 'needs_review', 'paid_terminal_conflict', expect.anything());
    expect(mockOrderRepo.guardedUpdateStatus).toHaveBeenCalledWith('o-cancelled', ['cancelled', 'refunded'], 'reconciling', 'paid_terminal_conflict', expect.anything());
    expect(mockOrderRepo.updateStatus).toHaveBeenCalledWith('o-cancelled', 'reconciling', expect.anything());
    expect(mockOrderRepo.createOrUpdateReconciliationCase).toHaveBeenCalledWith(expect.objectContaining({
      paymentIntentId: 'pi_late_success',
      orderId: 'o-cancelled',
      reason: 'paid_cancelled',
      severity: 'critical',
    }), expect.anything());
    expect(mockOrderRepo.markForReconciliation).toHaveBeenCalledWith('o-cancelled', expect.arrayContaining([
      'Payment pi_late_success succeeded after order had already reached terminal status cancelled.',
      'Manual review is required before fulfillment, refund, or inventory action.'
    ]));
    expect(mockAudit.recordWithTransaction).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      action: 'payment_received_on_cancelled_order',
      targetId: 'o-cancelled',
      correlationId: 'pi_late_success'
    }));
  });

  it('records fencing-token mismatches outside the transaction side-effect path', async () => {
    mockOrderRepo.getByPaymentTransactionIdTransactional.mockResolvedValueOnce({
      id: 'o-fence',
      userId: 'u1',
      status: 'pending',
      paymentTransactionId: 'pi_fence',
      fulfillmentMethod: 'shipping',
      metadata: { inventoryReserved: true, fencingToken: 7 },
      items: [{ productId: 'p1', quantity: 1, isDigital: false }]
    });
    mockOrderRepo.updateStatus = vi.fn().mockResolvedValue(undefined);
    mockOrderRepo.markForReconciliation = vi.fn().mockResolvedValue(undefined);

    const result = await orderService.finalizeOrderPayment('pi_fence', {
      id: 'pi_fence',
      status: 'succeeded',
      metadata: { orderId: 'o-fence', fencingToken: '3' },
      charges: { data: [] }
    });

    expect(result.status).toBe('reconciling');
    expect(mockOrderRepo.transitionPaymentState).toHaveBeenCalledWith('o-fence', ['unpaid', 'requires_payment_method', 'processing'], 'paid', 'stripe_succeeded_fencing_mismatch', expect.anything());
    expect(mockOrderRepo.transitionReconciliationState).toHaveBeenCalledWith('o-fence', ['none', 'needs_review'], 'needs_review', 'fencing_token_mismatch', expect.anything());
    expect(mockOrderRepo.guardedUpdateStatus).toHaveBeenCalledWith('o-fence', ['pending'], 'reconciling', 'fencing_token_mismatch', expect.anything());
    expect(mockOrderRepo.updateStatus).toHaveBeenCalledWith('o-fence', 'reconciling', expect.anything());
    expect(mockOrderRepo.createOrUpdateReconciliationCase).toHaveBeenCalledWith(expect.objectContaining({
      paymentIntentId: 'pi_fence',
      orderId: 'o-fence',
      reason: 'fencing_token_mismatch',
      severity: 'high',
    }), expect.anything());
    expect(mockOrderRepo.markForReconciliation).toHaveBeenCalledWith('o-fence', expect.arrayContaining([
      'Fencing token mismatch: Stripe PI token 3 does not match Order token 7.',
      'This suggests a race condition or manual intervention superseded the checkout lease.'
    ]));
    expect(mockAudit.recordWithTransaction).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      action: 'checkout_reconciliation_required',
      targetId: 'o-fence',
      correlationId: 'pi_fence'
    }));
  });

  it('should transactionally restore physical stock and update metadata on payment failure during checkout', async () => {
    const address = { street: '123 St', city: 'City', state: 'ST', zip: '12345', country: 'US' };

    // Force processPayment to throw an error
    mockPayment.processPayment.mockRejectedValueOnce(new Error('Stripe card declined'));

    mockOrderRepo.updateStatus = vi.fn().mockResolvedValue(undefined);
    mockOrderRepo.updateMetadata = vi.fn().mockResolvedValue(undefined);
    mockProductRepo.batchUpdateStock = vi.fn().mockResolvedValue(undefined);

    // Mock existing created order having metadata inventoryReserved: true
    mockOrderRepo.create.mockResolvedValueOnce({
      id: 'o1',
      userId: 'u1',
      status: 'pending',
      paymentTransactionId: null,
      discountCode: undefined,
      metadata: { inventoryReserved: true },
      items: [{ productId: 'p1', quantity: 1, isDigital: false }]
    });

    await expect(orderService.initiateCheckout(
      'u1',
      address as any,
      'user@example.com',
      'User',
      undefined,
      'bad-payment-key',
      'pm_declined'
    )).rejects.toThrow('Stripe card declined');

    // Verify order was cancelled
    expect(mockOrderRepo.transitionPaymentState).toHaveBeenCalledWith('o1', ['unpaid', 'requires_payment_method', 'processing', 'failed'], 'failed', 'payment_processor_failure');
    expect(mockOrderRepo.updateStatus).toHaveBeenCalledWith('o1', 'cancelled', undefined);

    // Verify physical product stock was batch updated to be restored (delta of positive item quantity)
    expect(mockProductRepo.batchUpdateStock).toHaveBeenLastCalledWith([
      { id: 'p1', delta: 1, variantId: undefined }
    ]);

    // Verify metadata is updated with inventoryReservationReleased: true
    expect(mockOrderRepo.updateMetadata).toHaveBeenCalledWith('o1', expect.objectContaining({
      inventoryReservationReleased: true
    }));
  });

  it('marks a paid order for reconciliation instead of releasing inventory when finalization fails', async () => {
    const address = { street: '123 St', city: 'City', state: 'ST', zip: '12345', country: 'US' };

    mockPayment.processPayment.mockResolvedValueOnce({
      success: true,
      transactionId: 'tx-paid-finalize-failed'
    });
    mockOrderRepo.updatePaymentTransactionId = vi.fn().mockResolvedValue(undefined);
    mockOrderRepo.updateStatus = vi.fn().mockResolvedValue(undefined);
    mockOrderRepo.markForReconciliation = vi.fn().mockResolvedValue(undefined);
    mockOrderRepo.create.mockResolvedValueOnce({
      id: 'o-paid',
      userId: 'u1',
      status: 'pending',
      total: 1000,
      paymentTransactionId: null,
      metadata: { inventoryReserved: true, fencingToken: 1 },
      items: [{ productId: 'p1', quantity: 1, isDigital: false }]
    });
    mockOrderRepo.getByPaymentTransactionIdTransactional.mockRejectedValueOnce(new Error('finalizer write failed'));

    await expect(orderService.initiateCheckout(
      'u1',
      address as any,
      'user@example.com',
      'User',
      undefined,
      'paid-but-finalizer-failed',
      'pm_123'
    )).rejects.toThrow('finalizer write failed');

    expect(mockOrderRepo.updatePaymentTransactionId).toHaveBeenCalledWith('o-paid', 'tx-paid-finalize-failed');
    expect(mockOrderRepo.transitionReconciliationState).toHaveBeenCalledWith('o-paid', ['none', 'needs_review'], 'needs_review', 'finalization_failure');
    expect(mockOrderRepo.updateStatus).toHaveBeenCalledWith('o-paid', 'reconciling', undefined);
    expect(mockOrderRepo.markForReconciliation).toHaveBeenCalledWith('o-paid', expect.arrayContaining([
      'Payment tx-paid-finalize-failed succeeded but order finalization failed.',
      'finalizer write failed'
    ]));
    expect(mockProductRepo.batchUpdateStock).toHaveBeenCalledWith([{ id: 'p1', delta: -1 }], expect.anything());
    expect(mockProductRepo.batchUpdateStock).not.toHaveBeenCalledWith([{ id: 'p1', delta: 1, variantId: undefined }]);
  });
});
