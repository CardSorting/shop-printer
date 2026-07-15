import { describe, expect, it, vi } from 'vitest';
import { createOrResumeClientPaymentIntent } from './checkoutPaymentIntentFlow';

function makeRepo() {
  return {
    updateMetadata: vi.fn(),
    transitionCheckoutAttemptPhase: vi.fn(),
    updatePaymentTransactionId: vi.fn(),
    updateCheckoutAttempt: vi.fn(),
    createOrUpdateReconciliationCase: vi.fn(),
  } as any;
}

describe('createOrResumeClientPaymentIntent', () => {
  it('cancels and rolls back an unpaid intent after its inventory reservation expires', async () => {
    const onRollback = vi.fn();
    const stripe = {
      createPaymentIntent: vi.fn(),
      getPaymentIntent: vi.fn().mockResolvedValue({
        id: 'pi_expired',
        client_secret: 'pi_expired_secret',
        amount: 5_000,
        status: 'requires_payment_method',
        metadata: { orderId: 'order_expired' },
      }),
      cancelPaymentIntent: vi.fn().mockResolvedValue({ status: 'canceled' }),
    };

    await expect(createOrResumeClientPaymentIntent({
      orderRepo: makeRepo(),
      order: {
        id: 'order_expired',
        userId: 'user_1',
        status: 'pending',
        total: 5_000,
        paymentTransactionId: 'pi_expired',
        metadata: { inventoryReservationExpiresAt: '2020-01-01T00:00:00.000Z' },
      } as any,
      userId: 'user_1',
      idempotencyKey: 'checkout-ui:expired',
      stripe,
      onRollback,
    })).rejects.toMatchObject({ name: 'CheckoutSessionExpiredError' });

    expect(stripe.cancelPaymentIntent).toHaveBeenCalledWith('pi_expired');
    expect(onRollback).toHaveBeenCalledWith(
      'order_expired',
      'checkout-ui:expired',
      'pi_expired',
      'checkout_expired_reservation_rollback',
    );
  });

  it('resumes an already-paid order as finalization-only recovery', async () => {
    const result = await createOrResumeClientPaymentIntent({
      orderRepo: makeRepo(),
      order: {
        id: 'order_paid',
        userId: 'user_1',
        status: 'processing',
        paymentState: 'paid',
        total: 5_000,
        paymentTransactionId: 'pi_paid',
        metadata: {},
      } as any,
      userId: 'user_1',
      idempotencyKey: 'checkout-ui:paid',
      stripe: {
        createPaymentIntent: vi.fn(),
        getPaymentIntent: vi.fn().mockResolvedValue({
          id: 'pi_paid',
          client_secret: 'pi_paid_secret',
          amount: 5_000,
          status: 'succeeded',
          metadata: { orderId: 'order_paid' },
        }),
        cancelPaymentIntent: vi.fn(),
      },
      onRollback: vi.fn(),
    });

    expect(result).toMatchObject({
      orderId: 'order_paid',
      paymentIntentId: 'pi_paid',
      paymentStatus: 'succeeded',
      resumed: true,
    });
  });
});
