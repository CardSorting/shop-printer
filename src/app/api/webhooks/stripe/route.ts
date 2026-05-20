import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { getServerServices } from '@infrastructure/server/services';
import { StripeService } from '@infrastructure/services/StripeService';
import { logger } from '@utils/logger';

export async function POST(request: Request) {
  const body = await request.text();
  const signature = (await headers()).get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
  }

  const stripeService = new StripeService();
  let event;

  try {
    event = stripeService.constructEvent(body, signature);
  } catch (err) {
    logger.error('Webhook signature verification failed', err);
    return NextResponse.json({ error: 'Webhook signature verification failed' }, { status: 400 });
  }

  const services = await getServerServices();

  try {
    // 1. Atomic Event Claim: Prevents duplicate processing while allowing retry of failed events
    const alreadyProcessed = await stripeService.tryProcessEvent(event.id, event.type);
    if (alreadyProcessed) {
      logger.info(`Webhook event ${event.id} already processed or in progress. Skipping.`);
      return Response.json({ received: true, duplicate: true });
    }

    // 2. Event Dispatch
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object;
        logger.info(`Processing payment_intent.succeeded: ${paymentIntent.id}`);
        
        await services.orderService.finalizeOrderPayment(paymentIntent.id, paymentIntent);
        break;
      }
      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object;
        logger.warn(`Processing payment_intent.payment_failed: ${paymentIntent.id}`);
        
        // Production Hardening: Dual-lookup with metadata fallback.
        // The PI→Order map write from create-payment-intent may not have committed yet
        // when this webhook arrives. Fall back to orderId stored in PI metadata.
        let order = await services.orderRepo.getByPaymentTransactionId(paymentIntent.id);
        if (!order && paymentIntent.metadata?.orderId) {
          const fallbackOrder = await services.orderRepo.getById(paymentIntent.metadata.orderId);
          if (fallbackOrder && (!fallbackOrder.paymentTransactionId || fallbackOrder.paymentTransactionId === paymentIntent.id)) {
            order = fallbackOrder;
            logger.info(`Resolved order via metadata fallback for PI ${paymentIntent.id}`, { orderId: fallbackOrder.id });
          }
        }

        // Cancel if still pending or confirmed (race: verify endpoint may have promoted status)
        if (order && (order.status === 'pending' || order.status === 'confirmed')) {
            await services.orderService.updateOrderStatus(order.id, 'cancelled', { 
                id: 'system', 
                email: 'stripe-webhook@dreambees.art' 
            });
        }
        break;
      }
      default:
        logger.info(`Unhandled event type: ${event.type}`);
    }

    // 3. Mark event as completed — permanently blocks future retries
    await stripeService.markEventProcessed(event.id, event.type);

    return Response.json({ received: true });
  } catch (error) {
    // Mark event as failed instead of deleting — allows Stripe retries while preserving
    // the record of the failed attempt. This prevents the replay-on-partial-mutation window
    // that existed when we deleted the event tracking doc.
    logger.error('Error processing Stripe webhook, marking event as failed for retry', error);
    if (event?.id) {
      try {
        await stripeService.markEventFailed(event.id, error instanceof Error ? error.message : 'Unknown error');
      } catch (rollbackError) {
        logger.error('FATAL: Failed to mark webhook event as failed — manual intervention required', { eventId: event.id, rollbackError });
      }
    }
    return NextResponse.json({ error: 'Internal server error processing webhook' }, { status: 500 });
  }
}

// Stripe webhooks need raw body, so we disable the default body parser if necessary
// In Next.js App Router, request.text() is already raw enough.
