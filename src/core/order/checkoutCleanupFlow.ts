import type { IOrderRepository } from '@domain/repositories';
import { logger } from '@utils/logger';
import { CHECKOUT_RECOVERY_PHASES } from './checkoutWorkflow';
import type { CheckoutStripeLookupPort, StripePaymentIntentSnapshot } from './checkoutTypes';

type CleanupDeps = {
  orderRepo: IOrderRepository;
  stripe: CheckoutStripeLookupPort;
  confirmPayment: (
    paymentIntentId: string,
    stripePi: StripePaymentIntentSnapshot,
    actor: string,
  ) => Promise<unknown>;
  cancelExpiredOrder: (orderId: string) => Promise<void>;
};

export async function cleanupExpiredPendingOrdersFlow(
  expirationMinutes: number,
  deps: CleanupDeps,
): Promise<{ count: number }> {
  const cutoff = new Date();
  cutoff.setMinutes(cutoff.getMinutes() - expirationMinutes);
  const { orders } = await deps.orderRepo.getAll({ status: 'pending', to: cutoff });
  let processed = 0;

  for (const order of orders) {
    if (order.paymentTransactionId) {
      try {
        const paymentIntent = await deps.stripe.getPaymentIntent(order.paymentTransactionId);
        if (paymentIntent.status === 'succeeded') {
          await Promise.resolve((deps.orderRepo as any).transitionCheckoutAttemptPhase?.({
            attemptId: order.idempotencyKey || order.metadata?.checkoutAttemptId || order.id,
            expectedPhases: CHECKOUT_RECOVERY_PHASES,
            nextPhase: 'RECOVER_OR_RECONCILE',
            authoritySource: 'stripe',
            waitingFor: 'verification',
            reason: 'cleanup_observed_stripe_success',
            orderId: order.id,
            paymentIntentId: paymentIntent.id,
            actor: 'system',
          })).catch(() => {});
          logger.info('cleanup_finalizing_stripe_succeeded_payment', {
            orderId: order.id,
            paymentIntentId: paymentIntent.id,
            checkoutAttemptId: order.idempotencyKey || order.metadata?.checkoutAttemptId || null,
          });
          await deps.confirmPayment(paymentIntent.id, paymentIntent, 'system');
          processed++;
          continue;
        }

        if (['processing', 'requires_action', 'requires_capture', 'requires_confirmation'].includes(paymentIntent.status)) {
          logger.warn('cleanup_blocked_by_active_payment_intent', {
            orderId: order.id,
            paymentIntentId: paymentIntent.id,
            stripeStatus: paymentIntent.status,
          });
          await deps.orderRepo.createOrUpdateReconciliationCase({
            paymentIntentId: paymentIntent.id,
            orderId: order.id,
            checkoutAttemptId: order.idempotencyKey || order.metadata?.checkoutAttemptId || null,
            reason: 'paid_not_finalized',
            severity: 'high',
            stripeStatus: paymentIntent.status,
            operatorVisibleMessage: `Expired pending order ${order.id} has active Stripe PaymentIntent ${paymentIntent.id} in status ${paymentIntent.status}.`,
            nextAction: 'Wait for Stripe terminal state or manually inspect before cancellation.',
            details: { cleanupBlocked: true, expirationMinutes },
            failureClassification: 'transient_external',
            lastObservedStripeState: paymentIntent.status,
            lastObservedLocalState: `status:${order.status};paymentState:${order.paymentState || 'unknown'}`,
            blockingProductionReadiness: false,
          });
          continue;
        }
      } catch (error) {
        logger.error('cleanup_stripe_lookup_failed', {
          orderId: order.id,
          paymentIntentId: order.paymentTransactionId,
          error,
        });
        await deps.orderRepo.createOrUpdateReconciliationCase({
          paymentIntentId: order.paymentTransactionId,
          orderId: order.id,
          checkoutAttemptId: order.idempotencyKey || order.metadata?.checkoutAttemptId || null,
          reason: 'paid_not_finalized',
          severity: 'critical',
          stripeStatus: null,
          operatorVisibleMessage: `Expired pending order ${order.id} could not verify Stripe PaymentIntent ${order.paymentTransactionId} before cancellation.`,
          nextAction: 'Verify Stripe status manually before cancelling, fulfilling, or refunding.',
          details: { error: error instanceof Error ? error.message : 'Unknown Stripe lookup error' },
          failureClassification: 'transient_external',
          lastObservedStripeState: null,
          lastObservedLocalState: `status:${order.status};paymentState:${order.paymentState || 'unknown'}`,
          blockingProductionReadiness: true,
        });
        continue;
      }
    }

    logger.info('cleanup_cancelling_expired_unpaid_order', {
      orderId: order.id,
      checkoutAttemptId: order.idempotencyKey || order.metadata?.checkoutAttemptId || null,
    });
    await deps.cancelExpiredOrder(order.id);
    processed++;
  }

  return { count: processed };
}
