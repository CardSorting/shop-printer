import type { IOrderRepository } from '@domain/repositories';
import { logger } from '@utils/logger';
import { CHECKOUT_RECOVERY_PHASES } from './checkoutWorkflow';
import type { CheckoutStripeLookupPort, StripePaymentIntentSnapshot } from './checkoutTypes';
import { transitionCheckoutOrderState } from './checkoutOrderState';
import type { CheckoutCleanupError, CleanupExpiredPendingOrdersReport } from './checkoutApplicationService';

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

function emptyReport(): CleanupExpiredPendingOrdersReport {
  return { scanned: 0, expired: 0, cancelled: 0, failed: 0, errors: [] };
}

export async function cleanupExpiredPendingOrdersFlow(
  expirationMinutes: number,
  deps: CleanupDeps,
): Promise<CleanupExpiredPendingOrdersReport> {
  const cutoff = new Date();
  cutoff.setMinutes(cutoff.getMinutes() - expirationMinutes);
  const { orders } = await deps.orderRepo.getAll({ status: 'pending', to: cutoff });
  const report = emptyReport();
  report.scanned = orders.length;
  report.expired = orders.length;

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
          try {
            await deps.confirmPayment(paymentIntent.id, paymentIntent, 'system');
            await transitionCheckoutOrderState({
              orderRepo: deps.orderRepo,
              orderId: order.id,
              from: ['pending_payment', 'checkout_session_created', 'recovery_pending', 'expired'],
              to: 'recovered',
              reason: 'cleanup_observed_stripe_success',
              source: 'system_cleanup',
              paymentIntentId: paymentIntent.id,
            });
          } catch (error) {
            report.failed++;
            report.errors.push({
              orderId: order.id,
              code: 'finalize_failed',
              message: error instanceof Error ? error.message : 'Payment finalization failed during cleanup',
              retryable: true,
            });
          }
          continue;
        }

        if (['processing', 'requires_action', 'requires_capture', 'requires_confirmation'].includes(paymentIntent.status)) {
          logger.warn('cleanup_blocked_by_active_payment_intent', {
            orderId: order.id,
            paymentIntentId: paymentIntent.id,
            stripeStatus: paymentIntent.status,
          });
          report.errors.push({
            orderId: order.id,
            code: 'active_payment_intent',
            message: `Active Stripe PaymentIntent in status ${paymentIntent.status}`,
            retryable: true,
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
        report.errors.push({
          orderId: order.id,
          code: 'stripe_lookup_failed',
          message: error instanceof Error ? error.message : 'Stripe lookup failed',
          retryable: true,
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
    try {
      await transitionCheckoutOrderState({
        orderRepo: deps.orderRepo,
        orderId: order.id,
        from: ['pending_payment', 'checkout_session_created', 'payment_failed'],
        to: 'expired',
        reason: 'cleanup_expired_pending',
        source: 'system_cleanup',
        paymentIntentId: order.paymentTransactionId,
      });
      await deps.cancelExpiredOrder(order.id);
      await transitionCheckoutOrderState({
        orderRepo: deps.orderRepo,
        orderId: order.id,
        from: ['expired', 'pending_payment', 'checkout_session_created'],
        to: 'cancelled',
        reason: 'cleanup_expired_pending',
        source: 'system_cleanup',
        paymentIntentId: order.paymentTransactionId,
      });
      report.cancelled++;
    } catch (error) {
      report.failed++;
      report.errors.push({
        orderId: order.id,
        code: 'cancel_failed',
        message: error instanceof Error ? error.message : 'Cancellation failed during cleanup',
        retryable: false,
      });
    }
  }

  logger.info('checkout_cleanup_report', {
    scanned: report.scanned,
    expired: report.expired,
    cancelled: report.cancelled,
    failed: report.failed,
    errors: report.errors.map((e) => ({
      orderId: e.orderId,
      code: e.code,
      retryable: e.retryable,
    })),
  });
  return report;
}
