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
    mockOrderRepo.getByIdempotencyKey.mockResolvedValueOnce({ id: 'o1', status: 'pending' });

    // Release lock manually for the test
    await mockLocker.releaseLock(`checkout_lock:u1`);

    // Second checkout with same idempotency key
    const order2 = await orderService.initiateCheckout('u1', address as any, 'user@example.com', 'User', undefined, idempotencyKey);
    
    expect(order2.id).toBe('o1'); // Should be the same order
    expect(mockOrderRepo.create).toHaveBeenCalledTimes(1); // Should not have called create again if it was truly idempotent at the repo level
    // Note: The mock above is a bit simplified; real hardening is in FirestoreOrderRepository.
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
      idempotencyKey
    });

    mockPayment.processPayment.mockResolvedValueOnce({
      success: true,
      transactionId: 'tx-recovered'
    });

    mockOrderRepo.updateStatus = vi.fn();
    mockOrderRepo.updatePaymentTransactionId = vi.fn();

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
    // Verify status is confirmed and paymentTransactionId is set in the returned order
    expect(order.status).toBe('confirmed');
    expect(order.paymentTransactionId).toBe('tx-recovered');

    // Verify repository update calls were made
    expect(mockOrderRepo.updateStatus).toHaveBeenCalledWith('o-existing', 'confirmed');
    expect(mockOrderRepo.updatePaymentTransactionId).toHaveBeenCalledWith('o-existing', 'tx-recovered');
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
    mockOrderRepo.getById.mockResolvedValueOnce(mockOrder);

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
    expect(mockOrderRepo.updateStatus).toHaveBeenCalledWith('o1', 'cancelled');

    // Verify physical product stock was batch updated to be restored (delta of positive item quantity)
    expect(mockProductRepo.batchUpdateStock).toHaveBeenLastCalledWith([
      { id: 'p1', delta: 1, variantId: undefined }
    ]);

    // Verify metadata is updated with inventoryReservationReleased: true
    expect(mockOrderRepo.updateMetadata).toHaveBeenCalledWith('o1', expect.objectContaining({
      inventoryReservationReleased: true
    }));
  });
});

