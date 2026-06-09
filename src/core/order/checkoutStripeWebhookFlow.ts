import { logger } from '@utils/logger';
import type { IOrderRepository } from '@domain/repositories';
import { resolveCheckoutOrderByPaymentIntent } from './checkoutOrderResolver';
import type { StripePaymentFailedResult, StripePaymentIntentSnapshot } from './CheckoutFlowService';

type StripePaymentFailedDeps = {
  orderRepo: IOrderRepository;
  confirmPayment: (
    paymentIntentId: string,
    stripePi: StripePaymentIntentSnapshot,
    actor: string,
  ) => Promise<{ id: string }>;
  rollbackUnpaidCheckout: (
    orderId: string,
    checkoutAttemptId: string,
    paymentIntentId: string,
    reason: string,
  ) => Promise<void>;
};

export async function handleStripePaymentFailedFlow(params: {
  paymentIntent: StripePaymentIntentSnapshot;
  currentPaymentIntent: StripePaymentIntentSnapshot;
  deps: StripePaymentFailedDeps;
}): Promise<StripePaymentFailedResult> {
  const { paymentIntent, currentPaymentIntent, deps } = params;
  const attemptId = paymentIntent.metadata?.checkoutKey || paymentIntent.id;

  if (currentPaymentIntent.status === 'succeeded') {
    logger.warn(`Ignoring stale payment_intent.payment_failed for succeeded intent ${paymentIntent.id}; finalizing instead.`);
    const order = await deps.confirmPayment(paymentIntent.id, currentPaymentIntent, 'stripe-webhook');
    return { action: 'finalized', orderId: order.id };
  }

  if (!['requires_payment_method', 'canceled'].includes(currentPaymentIntent.status)) {
    logger.info(`Payment intent ${paymentIntent.id} is not in a terminal failed state. Leaving order unchanged.`, {
      status: currentPaymentIntent.status,
    });
    return { action: 'ignored', reason: `non_terminal_stripe_status:${currentPaymentIntent.status}` };
  }

  const resolution = await resolveCheckoutOrderByPaymentIntent(deps.orderRepo, paymentIntent.id, {
    stripeMetadataOrderId: paymentIntent.metadata?.orderId,
  });

  if (!resolution.found) {
    return { action: 'ignored', reason: 'order_not_found' };
  }

  const order = resolution.order;
  if (resolution.source === 'stripe_metadata') {
    logger.info(`Resolved order via centralized checkout resolver for PI ${paymentIntent.id}`, {
      orderId: order.id,
    });
  }

  if (!(order.status === 'pending' || order.status === 'confirmed')) {
    return { action: 'ignored', reason: `order_status:${order.status}` };
  }

  if (order.paymentState === 'paid' || order.paymentState === 'partially_refunded' || order.paymentState === 'refunded') {
    logger.warn('stale_payment_failed_webhook_rejected', {
      paymentIntentId: paymentIntent.id,
      orderId: order.id,
      localPaymentState: order.paymentState,
      stripeStatus: currentPaymentIntent.status,
    });
    return { action: 'ignored', reason: 'local_payment_already_finalized' };
  }

  await deps.rollbackUnpaidCheckout(order.id, attemptId, paymentIntent.id, 'stripe_payment_failed');
  return { action: 'rolled_back', orderId: order.id };
}
