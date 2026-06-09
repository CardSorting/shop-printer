import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { getServerServices } from '@infrastructure/server/services';
import { logger } from '@utils/logger';

export async function POST(request: Request) {
  const body = await request.text();
  const signature = (await headers()).get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
  }

  const services = await getServerServices();
  const stripeService = services.stripeService;
  let event;

  try {
    event = stripeService.constructEvent(body, signature);
  } catch (err) {
    logger.error('Webhook signature verification failed', err);
    return NextResponse.json({ error: 'Webhook signature verification failed' }, { status: 400 });
  }

  let claimToken: string | null = null;

  try {
    const claimResult = await stripeService.tryProcessEvent(event.id, event.type);
    const alreadyProcessed = typeof claimResult === 'boolean' ? claimResult : claimResult.alreadyProcessed;
    claimToken = typeof claimResult === 'boolean' ? null : claimResult.claimToken;
    if (alreadyProcessed) {
      const status = await stripeService.getEventStatus(event.id);
      if (status === 'completed') {
        logger.info(`Webhook event ${event.id} already processed. Skipping.`);
        return Response.json({ received: true, duplicate: true });
      }

      logger.warn(`Webhook event ${event.id} is already being processed. Asking Stripe to retry instead of acknowledging early.`, { status });
      return NextResponse.json({ received: false, retry: true }, { status: 503 });
    }

    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object;
        const attemptId = paymentIntent.metadata?.checkoutKey || paymentIntent.id;
        logger.info(`[CHECKOUT-WORKFLOW] [Attempt: ${attemptId}] Processing payment_intent.succeeded: ${paymentIntent.id}. Transitioning AWAIT_PAYMENT_CONFIRMATION -> FINALIZE_PAYMENT.`);

        await services.checkout.confirmPaymentFromStripe(paymentIntent.id, paymentIntent, 'stripe-webhook');
        break;
      }
      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object;
        const attemptId = paymentIntent.metadata?.checkoutKey || paymentIntent.id;
        logger.warn(`[CHECKOUT-WORKFLOW] [Attempt: ${attemptId}] Processing payment_intent.payment_failed: ${paymentIntent.id}. Transitioning to RECOVER_OR_RECONCILE.`);

        const currentPaymentIntent = await stripeService.getPaymentIntent(paymentIntent.id);
        await services.checkout.handleStripePaymentFailed({
          paymentIntent,
          currentPaymentIntent,
        });
        break;
      }
      default:
        logger.info(`Unhandled event type: ${event.type}`);
    }

    await stripeService.markEventProcessed(event.id, event.type, claimToken);

    return Response.json({ received: true });
  } catch (error) {
    logger.error('Error processing Stripe webhook, marking event as failed for retry', error);
    if (event?.id) {
      try {
        await stripeService.markEventFailed(event.id, error instanceof Error ? error.message : 'Unknown error', claimToken);
      } catch (rollbackError) {
        logger.error('FATAL: Failed to mark webhook event as failed — manual intervention required', { eventId: event.id, rollbackError });
      }
    }
    return NextResponse.json({ error: 'Internal server error processing webhook' }, { status: 500 });
  }
}
