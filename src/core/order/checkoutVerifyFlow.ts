import type { IOrderRepository } from '@domain/repositories';
import type { Order } from '@domain/models';
import { OrderNotFoundError, UnauthorizedError } from '@domain/errors';
import { logger } from '@utils/logger';
import { CHECKOUT_PAYMENT_WAIT_PHASES, isSafelyFinalizedCheckoutState } from './checkoutWorkflow';
import {
  assertCheckoutOrderMetadataMatch,
  resolveCheckoutOrderByPaymentIntent,
} from './checkoutOrderResolver';
import type { StripePaymentIntentSnapshot } from './CheckoutFlowService';

export async function verifyPaymentFromClientFlow(params: {
  orderRepo: IOrderRepository;
  userId: string;
  paymentIntentId: string;
  stripePi: StripePaymentIntentSnapshot;
  confirmPayment: (paymentIntentId: string, stripePi: StripePaymentIntentSnapshot, actor: string) => Promise<Order>;
}): Promise<{ success: boolean; orderId?: string; status?: string; message?: string }> {
  const { orderRepo, userId, paymentIntentId, stripePi, confirmPayment } = params;

  const earlyResolution = await resolveCheckoutOrderByPaymentIntent(orderRepo, paymentIntentId);
  if (earlyResolution.found) {
    if (earlyResolution.order.userId !== userId) throw new UnauthorizedError();
    if (isSafelyFinalizedCheckoutState({
      paymentState: earlyResolution.order.paymentState,
      fulfillmentState: earlyResolution.order.fulfillmentState,
    })) {
      logger.info('checkout_verify_early_exit', {
        orderId: earlyResolution.order.id,
        paymentIntentId,
        paymentState: earlyResolution.order.paymentState,
        fulfillmentState: earlyResolution.order.fulfillmentState,
      });
      return {
        success: true,
        orderId: earlyResolution.order.id,
        status: earlyResolution.order.status,
      };
    }
  }

  const resolution = await resolveCheckoutOrderByPaymentIntent(orderRepo, paymentIntentId, {
    stripeMetadataOrderId: stripePi.metadata?.orderId,
    linkMissingPaymentTransaction: true,
  });

  if (!resolution.found) {
    throw new OrderNotFoundError(paymentIntentId);
  }

  const order = resolution.order;
  if (order.userId !== userId) throw new UnauthorizedError();
  assertCheckoutOrderMetadataMatch(order, stripePi.metadata?.orderId);

  if (stripePi.status !== 'succeeded') {
    return {
      success: false,
      status: stripePi.status,
      message: 'Payment not yet succeeded.',
    };
  }

  const attemptId = order.idempotencyKey || order.metadata?.checkoutAttemptId || stripePi.metadata?.checkoutKey || paymentIntentId;
  await orderRepo.transitionCheckoutAttemptPhase({
    attemptId,
    expectedPhases: [...CHECKOUT_PAYMENT_WAIT_PHASES, 'RECOVER_OR_RECONCILE'],
    nextPhase: 'AWAIT_PAYMENT_CONFIRMATION',
    authoritySource: 'stripe',
    waitingFor: 'verification',
    reason: 'verify_observed_stripe_success',
    orderId: order.id,
    paymentIntentId,
    actor: 'user',
  }).catch((err) => {
    logger.info('checkout_verify_phase_already_advanced', { orderId: order.id, paymentIntentId, err });
  });

  const finalizedOrder = await confirmPayment(paymentIntentId, stripePi, 'user');
  return {
    success: true,
    orderId: finalizedOrder.id,
    status: finalizedOrder.status,
  };
}
