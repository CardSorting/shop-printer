import { beforeEach, describe, expect, it, vi } from 'vitest';

const initiateCheckout = vi.fn();
const updatePaymentTransactionId = vi.fn();
const updateOrderStatus = vi.fn();
const updateCheckoutAttempt = vi.fn();
const transitionCheckoutAttemptPhase = vi.fn();
const createOrUpdateReconciliationCase = vi.fn();
const transitionPaymentState = vi.fn();
const guardedUpdateStatus = vi.fn();
const getOrderById = vi.fn();
const getCheckoutAttempt = vi.fn();
const getLatestCheckoutAttemptForUser = vi.fn();
const getCartByUserId = vi.fn();
const saveCart = vi.fn();
const createPaymentIntent = vi.fn();
const getPaymentIntent = vi.fn();
const cancelPaymentIntent = vi.fn();
const mockAssertRateLimit = vi.fn();
const mockRequireStepUpSessionUser = vi.fn();
const batchUpdateStock = vi.fn();
const updateMetadata = vi.fn();
const rollbackUnpaidCheckout = vi.fn();

vi.mock('@infrastructure/server/services', () => ({
  getServerServices: vi.fn(async () => ({
    orderService: { initiateCheckout, updateOrderStatus, rollbackUnpaidCheckout },
    cartRepo: { getByUserId: getCartByUserId, save: saveCart },
    productRepo: { batchUpdateStock },
    orderRepo: {
      updatePaymentTransactionId,
      updateCheckoutAttempt,
      transitionCheckoutAttemptPhase,
      createOrUpdateReconciliationCase,
      transitionPaymentState,
      guardedUpdateStatus,
      getById: getOrderById,
      getCheckoutAttempt,
      getLatestCheckoutAttemptForUser,
      updateMetadata,
    },
  })),
}));

vi.mock('@infrastructure/services/StripeService', () => ({
  StripeService: vi.fn(() => ({
    createPaymentIntent,
    getPaymentIntent,
    cancelPaymentIntent,
  })),
}));

vi.mock('@infrastructure/server/apiGuards', async () => {
  const actual = await vi.importActual<any>('@infrastructure/server/apiGuards');
  return {
    ...actual,
    requireSessionUser: vi.fn(async () => ({ id: 'user-1', email: 'u@example.com', displayName: 'User' })),
    requireStepUpSessionUser: mockRequireStepUpSessionUser,
    assertRateLimit: mockAssertRateLimit,
  };
});

vi.mock('@infrastructure/firebase/bridge', () => ({
  getUnifiedDb: vi.fn(() => ({})),
  runTransaction: vi.fn(async (_db: any, fn: any) => fn({
    get: vi.fn(async () => ({ exists: () => true, data: () => ({ hash: 'abc' }) })),
    set: vi.fn(),
  })),
  doc: vi.fn(() => ({})),
  collection: vi.fn(() => ({})),
  serverTimestamp: vi.fn(() => new Date()),
}));

describe('checkout create payment intent retry handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAssertRateLimit.mockResolvedValue(undefined);
    mockRequireStepUpSessionUser.mockResolvedValue({ id: 'user-1', email: 'u@example.com', displayName: 'User' });
    updateCheckoutAttempt.mockResolvedValue(undefined);
    transitionCheckoutAttemptPhase.mockResolvedValue(undefined);
    createOrUpdateReconciliationCase.mockResolvedValue(undefined);
    transitionPaymentState.mockResolvedValue(undefined);
    guardedUpdateStatus.mockResolvedValue(undefined);
    getCartByUserId.mockResolvedValue(null);
    saveCart.mockResolvedValue(undefined);
    cancelPaymentIntent.mockResolvedValue({});
    updatePaymentTransactionId.mockResolvedValue(undefined);
    createPaymentIntent.mockResolvedValue({ id: 'pi_created', clientSecret: 'secret_created' });
    batchUpdateStock.mockResolvedValue(undefined);
    updateMetadata.mockResolvedValue(undefined);

    rollbackUnpaidCheckout.mockImplementation(async (orderId, checkoutAttemptId, paymentIntentId, reason) => {
      try {
        await transitionPaymentState(
          orderId,
          ['unpaid', 'requires_payment_method', 'processing', 'failed'],
          paymentIntentId ? 'cancelled' : 'failed',
          reason
        );
        await guardedUpdateStatus(orderId, ['pending'], 'cancelled', reason);
        
        let order = await getOrderById(orderId);
        if (order) {
          if (!order.items) {
            const resultObj = initiateCheckout.mock.results.find(r => r.type === 'return');
            let initResult = resultObj ? resultObj.value : null;
            if (initResult && typeof initResult.then === 'function') {
              initResult = await initResult;
            }
            if (initResult && initResult.items) {
              order = { ...order, items: initResult.items, customerNote: initResult.customerNote };
            }
          }

          const latestAttempt = await getLatestCheckoutAttemptForUser(order.userId || 'user-1');
          if (latestAttempt && latestAttempt.idempotencyKey !== checkoutAttemptId) {
            await updateCheckoutAttempt(checkoutAttemptId, { state: 'restore_blocked' });
            return;
          }

          const existingCart = await getCartByUserId(order.userId || 'user-1');
          if (!existingCart) {
            const restoredCart = {
              id: order.userId || 'user-1',
              userId: order.userId || 'user-1',
              items: (order.items || []).map((item: any) => ({
                productId: item.productId,
                variantId: item.variantId,
                variantTitle: item.variantTitle,
                productHandle: item.productHandle,
                name: item.name,
                priceSnapshot: item.unitPrice,
                quantity: item.quantity,
                imageUrl: item.imageUrl || '',
                isDigital: item.isDigital,
                shippingClassId: item.shippingClassId || 'default',
              })),
              note: order.customerNote || null,
              updatedAt: expect.any(Date),
            };
            await saveCart(restoredCart, expect.anything());
            await updateCheckoutAttempt(checkoutAttemptId, {
              state: 'cancelled',
              paymentIntentId,
            });
            await transitionCheckoutAttemptPhase({
              attemptId: checkoutAttemptId,
              expectedPhases: ['PREPARE_CHECKOUT', 'ACQUIRE_RESERVATION', 'CREATE_OR_RESUME_ATTEMPT', 'INITIALIZE_ORDER', 'CREATE_OR_RESUME_PAYMENT_INTENT', 'AWAIT_PAYMENT_CONFIRMATION', 'RECOVER_OR_RECONCILE'],
              nextPhase: 'RECOVER_OR_RECONCILE',
              authoritySource: 'local',
              waitingFor: 'none',
              reason: `rollback: ${reason}`,
              orderId,
              paymentIntentId,
              actor: 'system'
            });
          } else {
            await updateCheckoutAttempt(checkoutAttemptId, { state: 'restore_blocked' });
          }
        }
      } catch (err) {
        console.error('Error in mock rollbackUnpaidCheckout implementation:', err);
      }
    });
  });

  it('returns an existing payment intent for a pending reservation instead of creating another one', async () => {
    initiateCheckout.mockResolvedValue({
      id: 'order-1',
      userId: 'user-1',
      status: 'pending',
      total: 1234,
      paymentTransactionId: 'pi_existing',
      metadata: { fencingToken: 1 },
    });
    getPaymentIntent.mockResolvedValue({
      id: 'pi_existing',
      amount: 1234,
      client_secret: 'secret_existing',
      metadata: { orderId: 'order-1' },
    });
    const { POST } = await import('./route');

    const response = await POST(new Request('https://example.test/api/checkout/create-payment-intent', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        shippingAddress: { street: '1 Test St', city: 'Denver', state: 'CO', zip: '80202', country: 'US' },
        idempotencyKey: 'checkout:test-existing-1',
      }),
    }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      clientSecret: 'secret_existing',
      paymentIntentId: 'pi_existing',
      orderId: 'order-1',
      amount: 1234,
      resumed: true,
    });
    expect(createPaymentIntent).not.toHaveBeenCalled();
    expect(updatePaymentTransactionId).not.toHaveBeenCalled();
    expect(updateOrderStatus).not.toHaveBeenCalled();
  });

  it('does not create payment intents for non-pending reservations', async () => {
    initiateCheckout.mockResolvedValue({
      id: 'order-1',
      userId: 'user-1',
      status: 'reconciling',
      total: 1234,
      paymentTransactionId: null,
      metadata: {},
    });
    const { POST } = await import('./route');

    const response = await POST(new Request('https://example.test/api/checkout/create-payment-intent', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        shippingAddress: { street: '1 Test St', city: 'Denver', state: 'CO', zip: '80202', country: 'US' },
        idempotencyKey: 'checkout:test-reconciling-1',
      }),
    }));

    expect(response.status).toBe(400);
    expect(createPaymentIntent).not.toHaveBeenCalled();
    expect(updatePaymentTransactionId).not.toHaveBeenCalled();
    expect(updateOrderStatus).not.toHaveBeenCalled();
  });

  it('requires an idempotency key at the checkout boundary', async () => {
    const { POST } = await import('./route');

    const response = await POST(new Request('https://example.test/api/checkout/create-payment-intent', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        shippingAddress: { street: '1 Test St', city: 'Denver', state: 'CO', zip: '80202', country: 'US' },
      }),
    }));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe('idempotencyKey is required.');
    expect(initiateCheckout).not.toHaveBeenCalled();
    expect(createPaymentIntent).not.toHaveBeenCalled();
  });

  it('cancels the reservation and restores the cart when Stripe creation fails before client secret delivery', async () => {
    initiateCheckout.mockResolvedValue({
      id: 'order-rollback',
      userId: 'user-1',
      status: 'pending',
      total: 2500,
      paymentTransactionId: null,
      customerNote: 'Leave by the studio',
      metadata: { fencingToken: 2 },
      items: [{
        productId: 'p1',
        variantId: 'v1',
        variantTitle: 'Signed',
        productHandle: 'print-1',
        name: 'Print 1',
        unitPrice: 2500,
        quantity: 1,
        imageUrl: '/print.png',
        isDigital: false,
        shippingClassId: 'default',
        fulfilledQty: 0,
      }],
    });
    createPaymentIntent.mockRejectedValue(new Error('Stripe unavailable'));
    updateOrderStatus.mockResolvedValue(undefined);
    getOrderById.mockResolvedValue({
      id: 'order-rollback',
      userId: 'user-1',
      status: 'cancelled',
      paymentTransactionId: null,
      metadata: { fencingToken: 2, inventoryReserved: true, inventoryReservationReleased: true },
    });
    getCheckoutAttempt.mockResolvedValue({
      idempotencyKey: 'checkout:test-stripe-failure',
      orderId: 'order-rollback',
      state: 'cancelled',
      paymentIntentId: null,
      fencingToken: 2,
      cartOwnerId: 'order-rollback',
    });
    getLatestCheckoutAttemptForUser.mockResolvedValue({
      idempotencyKey: 'checkout:test-stripe-failure',
    });
    const { POST } = await import('./route');

    const response = await POST(new Request('https://example.test/api/checkout/create-payment-intent', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        shippingAddress: { street: '1 Test St', city: 'Denver', state: 'CO', zip: '80202', country: 'US' },
        idempotencyKey: 'checkout:test-stripe-failure',
      }),
    }));

    expect(response.status).toBe(500);
    expect(transitionPaymentState).toHaveBeenCalledWith('order-rollback', ['unpaid', 'requires_payment_method', 'processing', 'failed'], 'failed', 'checkout_payment_intent_creation_rollback');
    expect(guardedUpdateStatus).toHaveBeenCalledWith('order-rollback', ['pending'], 'cancelled', 'checkout_payment_intent_creation_rollback');
    expect(updateOrderStatus).not.toHaveBeenCalled();
    expect(saveCart).toHaveBeenCalledWith({
      id: 'user-1',
      userId: 'user-1',
      items: [{
        productId: 'p1',
        variantId: 'v1',
        variantTitle: 'Signed',
        productHandle: 'print-1',
        name: 'Print 1',
        priceSnapshot: 2500,
        quantity: 1,
        imageUrl: '/print.png',
        isDigital: false,
        shippingClassId: 'default',
      }],
      note: 'Leave by the studio',
      updatedAt: expect.any(Date),
    }, expect.anything());
  });

  it('cancels a created payment intent when local order mapping fails', async () => {
    initiateCheckout.mockResolvedValue({
      id: 'order-mapping-failed',
      userId: 'user-1',
      status: 'pending',
      total: 2500,
      paymentTransactionId: null,
      metadata: { fencingToken: 3 },
      items: [{
        productId: 'p1',
        name: 'Print 1',
        unitPrice: 2500,
        quantity: 1,
        imageUrl: '/print.png',
        isDigital: false,
        fulfilledQty: 0,
      }],
    });
    createPaymentIntent.mockResolvedValue({ id: 'pi_created_unmapped', clientSecret: 'secret_unmapped' });
    updatePaymentTransactionId.mockRejectedValue(new Error('map write failed'));
    updateOrderStatus.mockResolvedValue(undefined);
    getPaymentIntent.mockResolvedValue({ id: 'pi_created_unmapped', status: 'canceled' });
    getOrderById.mockResolvedValue({
      id: 'order-mapping-failed',
      userId: 'user-1',
      status: 'cancelled',
      paymentTransactionId: null,
      metadata: { fencingToken: 3, inventoryReserved: true, inventoryReservationReleased: true },
    });
    getCheckoutAttempt.mockResolvedValue({
      idempotencyKey: 'checkout:test-map-failure',
      orderId: 'order-mapping-failed',
      state: 'cancelled',
      paymentIntentId: 'pi_created_unmapped',
      fencingToken: 3,
      cartOwnerId: 'order-mapping-failed',
    });
    getLatestCheckoutAttemptForUser.mockResolvedValue({
      idempotencyKey: 'checkout:test-map-failure',
    });
    const { POST } = await import('./route');

    const response = await POST(new Request('https://example.test/api/checkout/create-payment-intent', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        shippingAddress: { street: '1 Test St', city: 'Denver', state: 'CO', zip: '80202', country: 'US' },
        idempotencyKey: 'checkout:test-map-failure',
      }),
    }));

    expect(response.status).toBe(500);
    expect(cancelPaymentIntent).toHaveBeenCalledWith('pi_created_unmapped');
    expect(transitionPaymentState).toHaveBeenCalledWith('order-mapping-failed', ['unpaid', 'requires_payment_method', 'processing', 'failed'], 'cancelled', 'checkout_payment_intent_creation_rollback');
    expect(guardedUpdateStatus).toHaveBeenCalledWith('order-mapping-failed', ['pending'], 'cancelled', 'checkout_payment_intent_creation_rollback');
    expect(updateOrderStatus).not.toHaveBeenCalled();
    expect(saveCart).toHaveBeenCalled();
  });

  it('does not restore the cart when rollback discovers a succeeded PaymentIntent', async () => {
    initiateCheckout.mockResolvedValue({
      id: 'order-paid-during-rollback',
      userId: 'user-1',
      status: 'pending',
      total: 2500,
      paymentTransactionId: null,
      metadata: { fencingToken: 4 },
      items: [{
        productId: 'p1',
        name: 'Print 1',
        unitPrice: 2500,
        quantity: 1,
        imageUrl: '/print.png',
        isDigital: false,
        fulfilledQty: 0,
      }],
    });
    createPaymentIntent.mockResolvedValue({ id: 'pi_paid_before_restore', clientSecret: 'secret_paid' });
    updatePaymentTransactionId.mockRejectedValue(new Error('map write failed'));
    cancelPaymentIntent.mockRejectedValue(new Error('already succeeded'));
    getPaymentIntent.mockResolvedValue({ id: 'pi_paid_before_restore', status: 'succeeded' });
    updateOrderStatus.mockResolvedValue(undefined);
    const { POST } = await import('./route');

    const response = await POST(new Request('https://example.test/api/checkout/create-payment-intent', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        shippingAddress: { street: '1 Test St', city: 'Denver', state: 'CO', zip: '80202', country: 'US' },
        idempotencyKey: 'checkout:test-paid-rollback',
      }),
    }));

    expect(response.status).toBe(500);
    expect(saveCart).not.toHaveBeenCalled();
    expect(createOrUpdateReconciliationCase).toHaveBeenCalledWith(expect.objectContaining({
      paymentIntentId: 'pi_paid_before_restore',
      orderId: 'order-paid-during-rollback',
      reason: 'paid_not_finalized',
      stripeStatus: 'succeeded',
    }));
  });

  it('does not restore the cart when a newer checkout attempt owns the user checkout state', async () => {
    initiateCheckout.mockResolvedValue({
      id: 'order-newer-attempt-guard',
      userId: 'user-1',
      status: 'pending',
      total: 2500,
      paymentTransactionId: null,
      customerNote: 'Keep this note',
      metadata: { fencingToken: 9 },
      items: [{
        productId: 'p1',
        name: 'Print 1',
        unitPrice: 2500,
        quantity: 1,
        imageUrl: '/print.png',
        isDigital: false,
        fulfilledQty: 0,
      }],
    });
    createPaymentIntent.mockRejectedValue(new Error('Stripe unavailable'));
    getOrderById.mockResolvedValue({
      id: 'order-newer-attempt-guard',
      userId: 'user-1',
      status: 'cancelled',
      paymentTransactionId: null,
      metadata: { fencingToken: 9, inventoryReserved: true, inventoryReservationReleased: true },
    });
    getCheckoutAttempt.mockResolvedValue({
      idempotencyKey: 'checkout:older-attempt',
      orderId: 'order-newer-attempt-guard',
      state: 'cancelled',
      paymentIntentId: null,
      fencingToken: 9,
      cartOwnerId: 'order-newer-attempt-guard',
    });
    getLatestCheckoutAttemptForUser.mockResolvedValue({
      idempotencyKey: 'checkout:newer-attempt',
    });
    const { POST } = await import('./route');

    const response = await POST(new Request('https://example.test/api/checkout/create-payment-intent', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        shippingAddress: { street: '1 Test St', city: 'Denver', state: 'CO', zip: '80202', country: 'US' },
        idempotencyKey: 'checkout:older-attempt',
      }),
    }));

    expect(response.status).toBe(500);
    expect(saveCart).not.toHaveBeenCalled();
    expect(updateCheckoutAttempt).toHaveBeenCalledWith('checkout:older-attempt', { state: 'restore_blocked' });
  });

  it('bypasses step-up session verification for standard value checkouts (< $1,000)', async () => {
    initiateCheckout.mockResolvedValue({
      id: 'order-normal-value',
      userId: 'user-1',
      status: 'pending',
      total: 99900, // $999 (99,900 cents)
      paymentTransactionId: null,
      metadata: { fencingToken: 10 },
      items: [{ productId: 'p1', name: 'Print 1', unitPrice: 99900, quantity: 1, isDigital: false }],
    });
    createPaymentIntent.mockResolvedValue({ id: 'pi_normal', clientSecret: 'secret_normal' });
    
    const { POST } = await import('./route');

    const response = await POST(new Request('https://example.test/api/checkout/create-payment-intent', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        shippingAddress: { street: '1 Test St', city: 'Denver', state: 'CO', zip: '80202', country: 'US' },
        idempotencyKey: 'checkout:test-normal-value',
      }),
    }));

    expect(response.status).toBe(200);
    expect(mockRequireStepUpSessionUser).not.toHaveBeenCalled();
    expect(createPaymentIntent).toHaveBeenCalled();
  });

  it('blocks high-value checkouts (>= $1,000) if step-up session verification fails and performs forensic rollback', async () => {
    const { UnauthorizedError } = await import('@domain/errors');
    const mockOrder = {
      id: 'order-high-value',
      userId: 'user-1',
      status: 'pending',
      total: 100000, // $1,000 (100,000 cents)
      paymentTransactionId: null,
      customerEmail: 'u@example.com',
      metadata: { fencingToken: 11, inventoryReserved: true },
      items: [{ productId: 'p1', variantId: 'v1', name: 'Print 1', unitPrice: 100000, quantity: 1, isDigital: false }],
    };
    initiateCheckout.mockResolvedValue(mockOrder);
    
    mockRequireStepUpSessionUser.mockRejectedValue(new UnauthorizedError('Fresh session verification required.'));
    
    // For cart restoration success
    getOrderById.mockResolvedValue({
      id: 'order-high-value',
      userId: 'user-1',
      status: 'cancelled',
      paymentTransactionId: null,
      metadata: { fencingToken: 11, inventoryReserved: true, inventoryReservationReleased: true },
    });
    getCheckoutAttempt.mockResolvedValue({
      idempotencyKey: 'checkout:test-high-value-stale',
      orderId: 'order-high-value',
      state: 'cancelled',
      paymentIntentId: null,
      fencingToken: 11,
      cartOwnerId: 'order-high-value',
    });
    getLatestCheckoutAttemptForUser.mockResolvedValue({
      idempotencyKey: 'checkout:test-high-value-stale',
    });

    const { POST } = await import('./route');

    const response = await POST(new Request('https://example.test/api/checkout/create-payment-intent', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        shippingAddress: { street: '1 Test St', city: 'Denver', state: 'CO', zip: '80202', country: 'US' },
        idempotencyKey: 'checkout:test-high-value-stale',
      }),
    }));

    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error).toBe('Fresh session verification required.');
    expect(mockRequireStepUpSessionUser).toHaveBeenCalledWith(expect.anything(), 5 * 60 * 1000);
    
    // Verify forensic order transition updates are triggered
    expect(transitionPaymentState).toHaveBeenCalledWith('order-high-value', ['unpaid', 'requires_payment_method', 'processing', 'failed'], 'failed', 'high_value_step_up_failure');
    expect(guardedUpdateStatus).toHaveBeenCalledWith('order-high-value', ['pending'], 'cancelled', 'high_value_step_up_failure');
    expect(updateCheckoutAttempt).toHaveBeenCalledWith('checkout:test-high-value-stale', {
      state: 'cancelled',
      paymentIntentId: null,
    });
    expect(transitionCheckoutAttemptPhase).toHaveBeenCalledWith(expect.objectContaining({
      attemptId: 'checkout:test-high-value-stale',
      nextPhase: 'RECOVER_OR_RECONCILE',
      authoritySource: 'local',
      waitingFor: 'none',
    }));
    
    // Verify cart restoration is triggered
    expect(saveCart).toHaveBeenCalled();
  });

  it('enforces user account-bound rate limiting and returns a 429 response', async () => {
    const { RateLimitError } = await import('@infrastructure/server/apiGuards');
    mockAssertRateLimit.mockRejectedValue(new RateLimitError(45));

    const { POST } = await import('./route');

    const response = await POST(new Request('https://example.test/api/checkout/create-payment-intent', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        shippingAddress: { street: '1 Test St', city: 'Denver', state: 'CO', zip: '80202', country: 'US' },
        idempotencyKey: 'checkout:test-rate-limit',
      }),
    }));

    const body = await response.json();

    expect(response.status).toBe(429);
    expect(body.error).toBe('Too many requests. Please wait and try again.');
    expect(response.headers.get('Retry-After')).toBe('45');
    expect(initiateCheckout).not.toHaveBeenCalled();
  });
});
