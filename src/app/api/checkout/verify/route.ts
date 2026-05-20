import { NextResponse } from 'next/server';
import { getServerServices } from '@infrastructure/server/services';
import { jsonError, requireSessionUser, requireString } from '@infrastructure/server/apiGuards';
import { StripeService } from '@infrastructure/services/StripeService';
import { logger } from '@utils/logger';
import { DomainError, OrderNotFoundError, UnauthorizedError } from '@domain/errors';
import { isSafelyFinalizedCheckoutState } from '@core/order/checkoutWorkflow';

/**
 * [LAYER: INTERFACE]
 * Success-Page Verification Route (Speed-of-Light UI Feedback)
 * This route allows the client to immediately verify payment status 
 * without waiting for the asynchronous webhook.
 */
export async function GET(request: Request) {
  try {
    const user = await requireSessionUser();
    const { searchParams } = new URL(request.url);
    const paymentIntentId = requireString(searchParams.get('payment_intent'), 'payment_intent');

    const services = await getServerServices();

    // Safe early exit: only bypass if independent state tracks show finalization completed.
    let order = await services.orderRepo.getByPaymentTransactionId(paymentIntentId);
    if (order) {
      if (order.userId !== user.id) throw new UnauthorizedError();
      if (isSafelyFinalizedCheckoutState({
        paymentState: order.paymentState,
        fulfillmentState: order.fulfillmentState,
      })) {
        logger.info('checkout_verify_early_exit', {
          orderId: order.id,
          paymentIntentId,
          paymentState: order.paymentState,
          fulfillmentState: order.fulfillmentState,
        });
        return NextResponse.json({
          success: true,
          orderId: order.id,
          status: order.status
        });
      }
    }

    const stripeService = new StripeService();
    
    // 1. Fetch PI from Stripe for authoritative status
    const pi = await stripeService.getPaymentIntent(paymentIntentId);
    if (!order && pi.metadata?.orderId) {
      const fallbackOrder = await services.orderRepo.getById(pi.metadata.orderId);
      if (fallbackOrder && (!fallbackOrder.paymentTransactionId || fallbackOrder.paymentTransactionId === paymentIntentId)) {
        order = fallbackOrder;
        if (!fallbackOrder.paymentTransactionId) {
          await services.orderRepo.updatePaymentTransactionId(fallbackOrder.id, paymentIntentId);
        }
        logger.info('Resolved checkout verification via payment intent metadata fallback', {
          paymentIntentId,
          orderId: fallbackOrder.id,
        });
      }
    }
    if (!order) throw new OrderNotFoundError(paymentIntentId);
    if (order.userId !== user.id) throw new UnauthorizedError();
    if (pi.metadata?.orderId && pi.metadata.orderId !== order.id) {
      throw new DomainError('Payment intent metadata does not match this order.');
    }
    
    if (pi.status === 'succeeded') {
        const attemptId = order.idempotencyKey || order.metadata?.checkoutAttemptId || pi.metadata?.checkoutKey || paymentIntentId;
        await (services.orderRepo as any).transitionCheckoutAttemptPhase?.({
          attemptId,
          expectedPhases: ['CREATE_OR_RESUME_PAYMENT_INTENT', 'AWAIT_PAYMENT_CONFIRMATION', 'RECOVER_OR_RECONCILE'],
          nextPhase: 'AWAIT_PAYMENT_CONFIRMATION',
          authoritySource: 'stripe',
          waitingFor: 'verification',
          reason: 'verify_observed_stripe_success',
          orderId: order.id,
          paymentIntentId,
        }).catch((err: any) => {
          logger.info('checkout_verify_phase_already_advanced', { orderId: order.id, paymentIntentId, err });
        });
        // 2. Authoritatively finalize if not already done by webhook
        // (OrderService.finalizeOrderPayment is idempotent)
        const finalizedOrder = await services.orderService.finalizeOrderPayment(paymentIntentId, pi);
        
        return NextResponse.json({
            success: true,
            orderId: finalizedOrder.id,
            status: finalizedOrder.status
        });
    }

    return NextResponse.json({
        success: false,
        status: pi.status,
        message: 'Payment not yet succeeded.'
    });

  } catch (error) {
    logger.error('Checkout verification failed', error);
    return jsonError(error, 'Verification failed');
  }
}
