import { beforeEach, describe, expect, it } from 'vitest';
import {
  CheckoutFinalizationError,
  checkoutSessionNeedsPayment,
  clearActiveCheckoutSession,
  createClientCheckoutSession,
  finalizeClientCheckout,
  markCheckoutPaymentRequired,
  markCheckoutPaymentSubmitted,
  readActiveCheckoutSession,
  saveActiveCheckoutSession,
} from './index';

function makeSession(status = 'requires_payment_method') {
  return createClientCheckoutSession({
    clientSecret: 'pi_secret_1',
    paymentIntentId: 'pi_1',
    orderId: 'order_1',
    amount: 5_599,
    paymentStatus: status,
    expiresAt: '2030-01-01T00:00:00.000Z',
  }, {
    ownerUserId: 'user_1',
    attemptKey: 'checkout-ui:attempt_1',
    requiresShipping: true,
    now: new Date('2029-12-31T23:45:00.000Z'),
  });
}

describe('client checkout session protocol', () => {
  beforeEach(() => clearActiveCheckoutSession());

  it('derives an explicit phase from Stripe status', () => {
    expect(checkoutSessionNeedsPayment(makeSession())).toBe(true);
    expect(checkoutSessionNeedsPayment(makeSession('succeeded'))).toBe(false);
    expect(checkoutSessionNeedsPayment(makeSession('processing'))).toBe(false);
  });

  it('persists only versioned sessions owned by the active user', () => {
    const session = makeSession();
    saveActiveCheckoutSession(session);

    expect(readActiveCheckoutSession('user_1')).toEqual(session);
    expect(readActiveCheckoutSession('user_2')).toBeNull();
    expect(readActiveCheckoutSession()).toBeNull();
  });

  it('moves between payment entry and submitted recovery without changing identity', () => {
    const session = makeSession();
    const submitted = markCheckoutPaymentSubmitted(session, 'processing');
    const retry = markCheckoutPaymentRequired(submitted, 'requires_payment_method');

    expect(submitted).toMatchObject({
      orderId: session.orderId,
      paymentIntentId: session.paymentIntentId,
      phase: 'payment_submitted',
      paymentStatus: 'processing',
    });
    expect(retry.phase).toBe('awaiting_payment');
  });

  it('deletes an unversioned session instead of executing a retired protocol', () => {
    window.sessionStorage.setItem('checkout:attemptKey', 'checkout-ui:legacy');
    window.sessionStorage.setItem('checkout:activeSession', JSON.stringify({
      clientSecret: 'pi_legacy_secret',
      paymentIntentId: 'pi_legacy',
      orderId: 'order_legacy',
      amount: 2_500,
      requiresShipping: false,
    }));

    expect(readActiveCheckoutSession('user_legacy')).toBeNull();
    expect(window.sessionStorage.getItem('checkout:activeSession')).toBeNull();
    expect(window.sessionStorage.getItem('checkout:attemptKey')).toBeNull();
  });
});

describe('client checkout finalization', () => {
  const order = { id: 'order_1', status: 'processing' } as any;

  it('retries transient verification failures and loads the verified order', async () => {
    let attempts = 0;
    const result = await finalizeClientCheckout({
      paymentIntentId: 'pi_1',
      expectedOrderId: 'order_1',
      delaysMs: [0, 1],
      waitForDelay: async () => undefined,
      verify: async () => {
        attempts += 1;
        if (attempts === 1) throw Object.assign(new Error('temporarily unavailable'), { status: 503, retryable: true });
        return { success: true, orderId: 'order_1', status: 'processing' };
      },
      loadOrder: async () => order,
    });

    expect(result).toBe(order);
    expect(attempts).toBe(2);
  });

  it('reopens payment entry for a terminal payment-method failure', async () => {
    await expect(finalizeClientCheckout({
      paymentIntentId: 'pi_1',
      delaysMs: [0],
      verify: async () => ({
        success: false,
        status: 'requires_payment_method',
        message: 'Your card was declined.',
      }),
      loadOrder: async () => order,
    })).rejects.toMatchObject<Partial<CheckoutFinalizationError>>({
      name: 'CheckoutFinalizationError',
      paymentStatus: 'requires_payment_method',
      retryable: false,
    });
  });

  it('fails closed when verification resolves to another order', async () => {
    await expect(finalizeClientCheckout({
      paymentIntentId: 'pi_1',
      expectedOrderId: 'order_1',
      delaysMs: [0],
      verify: async () => ({ success: true, orderId: 'order_2', status: 'processing' }),
      loadOrder: async () => order,
    })).rejects.toThrow(/different order/i);
  });

  it('requires a fresh checkout after Stripe cancels the intent', async () => {
    await expect(finalizeClientCheckout({
      paymentIntentId: 'pi_1',
      delaysMs: [0],
      verify: async () => ({ success: false, status: 'canceled', message: 'Payment canceled.' }),
      loadOrder: async () => order,
    })).rejects.toMatchObject({
      paymentStatus: 'canceled',
      retryable: false,
    });
  });
});
