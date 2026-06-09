import { logger } from '@utils/logger';
import type { StripeService } from '@infrastructure/services/StripeService';
import type { HandleCheckoutWebhookResult } from './checkoutApplicationService';
import type { StripePaymentIntentSnapshot } from './checkoutTypes';

type WebhookCheckoutDeps = {
  stripe: Pick<
    StripeService,
    | 'constructEvent'
    | 'tryProcessEvent'
    | 'getEventStatus'
    | 'getPaymentIntent'
    | 'markEventProcessed'
    | 'markEventFailed'
  >;
  confirmPaymentFromStripe: (
    paymentIntentId: string,
    stripePi: StripePaymentIntentSnapshot | undefined,
    actor: string,
    stripeEventId?: string,
  ) => Promise<unknown>;
  handleStripePaymentFailed: (params: {
    paymentIntent: StripePaymentIntentSnapshot;
    currentPaymentIntent: StripePaymentIntentSnapshot;
    stripeEventId?: string;
  }) => Promise<unknown>;
};

export async function handleCheckoutWebhookFlow(
  input: { rawBody: string; signature: string },
  deps: WebhookCheckoutDeps,
): Promise<HandleCheckoutWebhookResult> {
  if (!input.signature) {
    return { status: 400, body: { error: 'Missing stripe-signature header' } };
  }

  let event: { id: string; type: string; data: { object: StripePaymentIntentSnapshot } };
  try {
    event = deps.stripe.constructEvent(input.rawBody, input.signature) as typeof event;
  } catch (err) {
    logger.error('Webhook signature verification failed', err);
    return { status: 400, body: { error: 'Webhook signature verification failed' } };
  }

  let claimToken: string | null = null;

  try {
    const claimResult = await deps.stripe.tryProcessEvent(event.id, event.type);
    const alreadyProcessed = typeof claimResult === 'boolean' ? claimResult : claimResult.alreadyProcessed;
    claimToken = typeof claimResult === 'boolean' ? null : claimResult.claimToken;

    if (alreadyProcessed) {
      const status = await deps.stripe.getEventStatus(event.id);
      if (status === 'completed') {
        logger.info(`Webhook event ${event.id} already processed. Skipping.`);
        return { status: 200, body: { received: true, duplicate: true } };
      }

      logger.warn(`Webhook event ${event.id} is already being processed. Asking Stripe to retry.`, { status });
      return { status: 503, body: { received: false, retry: true } };
    }

    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object;
        const attemptId = paymentIntent.metadata?.checkoutKey || paymentIntent.id;
        logger.info(`[CHECKOUT-WORKFLOW] [Attempt: ${attemptId}] payment_intent.succeeded: ${paymentIntent.id}`);
        await deps.confirmPaymentFromStripe(paymentIntent.id, paymentIntent, 'stripe-webhook', event.id);
        break;
      }
      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object;
        const attemptId = paymentIntent.metadata?.checkoutKey || paymentIntent.id;
        logger.warn(`[CHECKOUT-WORKFLOW] [Attempt: ${attemptId}] payment_intent.payment_failed: ${paymentIntent.id}`);
        const currentPaymentIntent = await deps.stripe.getPaymentIntent(paymentIntent.id);
        await deps.handleStripePaymentFailed({
          paymentIntent,
          currentPaymentIntent: currentPaymentIntent as StripePaymentIntentSnapshot,
          stripeEventId: event.id,
        });
        break;
      }
      default:
        logger.info(`Unhandled event type: ${event.type}`);
    }

    await deps.stripe.markEventProcessed(event.id, event.type, claimToken);
    return { status: 200, body: { received: true } };
  } catch (error) {
    logger.error('Error processing Stripe webhook, marking event as failed for retry', error);
    try {
      await deps.stripe.markEventFailed(
        event.id,
        error instanceof Error ? error.message : 'Unknown error',
        claimToken,
      );
    } catch (rollbackError) {
      logger.error('FATAL: Failed to mark webhook event as failed', { eventId: event.id, rollbackError });
    }
    return { status: 500, body: { error: 'Internal server error processing webhook' } };
  }
}
