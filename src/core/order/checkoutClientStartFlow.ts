import { logger } from '@utils/logger';
import type { IOrderRepository } from '@domain/repositories';
import type { CheckoutMutationBackend } from './checkoutMutationBackend';
import {
  createOrResumeClientPaymentIntent,
  type CheckoutStripePort,
  type ClientPaymentIntentResult,
} from './checkoutPaymentIntentFlow';
import type { StartClientCheckoutParams } from './checkoutTypes';

export async function startClientCheckoutFlow(params: {
  mutations: CheckoutMutationBackend;
  orderRepo: IOrderRepository;
  input: StartClientCheckoutParams;
  highValueThresholdCents: number;
  onRollback: (
    orderId: string,
    checkoutAttemptId: string,
    paymentIntentId: string | null,
    reason: string,
  ) => Promise<void>;
  onSessionCreated?: (orderId: string, paymentIntentId: string) => Promise<void>;
}): Promise<ClientPaymentIntentResult> {
  const { mutations, orderRepo, input, highValueThresholdCents, onRollback, onSessionCreated } = params;

  const order = await mutations.runCheckoutReservation({
    userId: input.userId,
    shippingAddress: input.shippingAddress,
    userEmail: input.userEmail,
    userName: input.userName,
    discountCode: input.discountCode,
    idempotencyKey: input.idempotencyKey,
  });

  if (order.total >= highValueThresholdCents) {
    if (!input.requireHighValueStepUp) {
      throw new Error('High-value checkout requires step-up verification.');
    }

    try {
      await input.requireHighValueStepUp();
    } catch (stepUpErr) {
      logger.warn('Step-up verification failed for high-value order checkout. Triggering forensic rollback.', {
        userId: input.userId,
        orderId: order.id,
        total: order.total,
      });

      await mutations.rollbackUnpaidCheckout(
        order.id,
        input.idempotencyKey,
        null,
        'high_value_step_up_failure',
      );

      throw stepUpErr;
    }
  }

  const result = await createOrResumeClientPaymentIntent({
    orderRepo,
    order,
    userId: input.userId,
    idempotencyKey: input.idempotencyKey,
    stripe: input.stripe as CheckoutStripePort,
    onRollback,
  });

  if (onSessionCreated && !['processing', 'succeeded'].includes(result.paymentStatus)) {
    await onSessionCreated(result.orderId, result.paymentIntentId).catch((error) => {
      logger.error('Checkout session was created, but its presentation-state marker could not be updated.', {
        orderId: result.orderId,
        paymentIntentId: result.paymentIntentId,
        error,
      });
    });
  }

  return result;
}
