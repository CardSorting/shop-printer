import { beforeEach, describe, expect, it, vi } from 'vitest';

const initiateCheckout = vi.fn();
const updatePaymentTransactionId = vi.fn();
const updateOrderStatus = vi.fn();
const updateCheckoutAttempt = vi.fn();
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

vi.mock('@infrastructure/server/services', () => ({
  getServerServices: vi.fn(async () => ({
    orderService: { initiateCheckout, updateOrderStatus },
    cartRepo: { getByUserId: getCartByUserId, save: saveCart },
    orderRepo: {
      updatePaymentTransactionId,
      updateCheckoutAttempt,
      createOrUpdateReconciliationCase,
      transitionPaymentState,
      guardedUpdateStatus,
      getById: getOrderById,
      getCheckoutAttempt,
      getLatestCheckoutAttemptForUser,
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
    assertRateLimit: vi.fn(async () => undefined),
  };
});

vi.mock('@infrastructure/firebase/bridge', () => ({
  getUnifiedDb: vi.fn(() => ({})),
  runTransaction: vi.fn(async (_db: any, fn: any) => fn({})),
}));

describe('checkout create payment intent retry handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    updateCheckoutAttempt.mockResolvedValue(undefined);
    createOrUpdateReconciliationCase.mockResolvedValue(undefined);
    transitionPaymentState.mockResolvedValue(undefined);
    guardedUpdateStatus.mockResolvedValue(undefined);
    getCartByUserId.mockResolvedValue(null);
    saveCart.mockResolvedValue(undefined);
    cancelPaymentIntent.mockResolvedValue({});
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
});
