import type { IOrderRepository } from '@domain/repositories';
import type { Order } from '@domain/models';
import { DomainError } from '@domain/errors';
import { logger } from '@utils/logger';
import {
  CHECKOUT_PAYMENT_INTENT_ENTRY_PHASES,
  CHECKOUT_PAYMENT_WAIT_PHASES,
} from './checkoutWorkflow';

export type CheckoutStripePort = {
  createPaymentIntent(params: {
    amount: number;
    currency: string;
    userId: string;
    orderId?: string;
    idempotencyKey?: string;
    metadata?: Record<string, string>;
  }): Promise<{ clientSecret: string; id: string }>;
  getPaymentIntent(id: string): Promise<{
    id: string;
    client_secret: string | null;
    amount: number;
    status: string;
    metadata?: Record<string, string>;
  }>;
  cancelPaymentIntent(id: string): Promise<{ status: string }>;
};

export type ClientPaymentIntentResult = {
  clientSecret: string;
  paymentIntentId: string;
  orderId: string;
  amount: number;
  resumed?: boolean;
};

type RollbackHandler = (
  orderId: string,
  checkoutAttemptId: string,
  paymentIntentId: string | null,
  reason: string
) => Promise<void>;

async function transitionToPaymentIntentPhase(
  orderRepo: IOrderRepository,
  order: Order,
  attemptId: string,
  reason: string,
  paymentIntentId?: string
): Promise<void> {
  await orderRepo.updateMetadata(order.id, {
    ...(order.metadata || {}),
    currentPhase: 'CREATE_OR_RESUME_PAYMENT_INTENT',
    authoritySource: 'local',
    waitingFor: 'none',
  });
  await orderRepo.transitionCheckoutAttemptPhase({
    attemptId,
    expectedPhases: CHECKOUT_PAYMENT_INTENT_ENTRY_PHASES,
    nextPhase: 'CREATE_OR_RESUME_PAYMENT_INTENT',
    authoritySource: 'local',
    waitingFor: 'none',
    reason,
    orderId: order.id,
    paymentIntentId,
  }).catch((err) => {
    logger.info('checkout_payment_intent_phase_already_advanced', {
      orderId: order.id,
      paymentIntentId,
      reason,
      err,
    });
  });
}

async function transitionToAwaitPaymentPhase(
  orderRepo: IOrderRepository,
  order: Order,
  attemptId: string,
  reason: string,
  paymentIntentId: string
): Promise<void> {
  await orderRepo.updateMetadata(order.id, {
    ...(order.metadata || {}),
    currentPhase: 'AWAIT_PAYMENT_CONFIRMATION',
    authoritySource: 'stripe',
    waitingFor: 'webhook',
  });
  await orderRepo.transitionCheckoutAttemptPhase({
    attemptId,
    expectedPhases: CHECKOUT_PAYMENT_WAIT_PHASES,
    nextPhase: 'AWAIT_PAYMENT_CONFIRMATION',
    authoritySource: 'stripe',
    waitingFor: 'webhook',
    reason,
    orderId: order.id,
    paymentIntentId,
  });
}

async function recordPaymentIntentPersistenceFailure(
  orderRepo: IOrderRepository,
  order: Order,
  attemptId: string,
  paymentIntentId: string,
  stripeStatus: string
): Promise<void> {
  const reason = stripeStatus === 'succeeded' ? 'paid_not_finalized' : 'finalization_failure';
  await orderRepo.createOrUpdateReconciliationCase({
    paymentIntentId,
    orderId: order.id,
    checkoutAttemptId: attemptId,
    reason,
    severity: 'critical',
    stripeStatus,
    operatorVisibleMessage:
      stripeStatus === 'succeeded'
        ? `PaymentIntent ${paymentIntentId} succeeded for order ${order.id}, but local checkout persistence did not complete.`
        : `PaymentIntent ${paymentIntentId} was created in status ${stripeStatus} for order ${order.id}, but local checkout persistence did not complete.`,
    nextAction: 'Verify the Stripe PaymentIntent terminal state and confirm local rollback or repair the mapping.',
    failureClassification: 'local_persistence_failure',
    lastObservedStripeState: stripeStatus,
    lastObservedLocalState: `status:${order.status};paymentTransactionId:${order.paymentTransactionId || 'null'}`,
    blockingProductionReadiness: true,
  }).catch((caseErr) => {
    logger.error('FATAL: Failed to create local persistence reconciliation case after PaymentIntent side effect', {
      orderId: order.id,
      paymentIntentId,
      caseErr,
    });
  });
}

/**
 * Centralized client PaymentIntent creation/resume flow. API routes should delegate here.
 */
export async function createOrResumeClientPaymentIntent(params: {
  orderRepo: IOrderRepository;
  order: Order;
  userId: string;
  idempotencyKey: string;
  stripe: CheckoutStripePort;
  onRollback: RollbackHandler;
}): Promise<ClientPaymentIntentResult> {
  const { orderRepo, order, userId, idempotencyKey, stripe, onRollback } = params;

  if (order.status !== 'pending') {
    throw new DomainError(`Checkout reservation is no longer payable (status: ${order.status}). Please start a new checkout.`);
  }

  if (order.paymentTransactionId) {
    const existingPi = await stripe.getPaymentIntent(order.paymentTransactionId);
    if (existingPi.metadata?.orderId && existingPi.metadata.orderId !== order.id) {
      throw new DomainError('Existing payment intent metadata does not match this checkout reservation.');
    }
    if (existingPi.amount !== order.total) {
      throw new DomainError('Existing payment intent amount does not match this checkout reservation.');
    }
    if (!existingPi.client_secret) {
      throw new DomainError('Existing payment intent cannot be resumed.');
    }

    await transitionToPaymentIntentPhase(orderRepo, order, idempotencyKey, 'resume_existing_payment_intent', existingPi.id);
    await transitionToAwaitPaymentPhase(orderRepo, order, idempotencyKey, 'existing_payment_intent_returned_to_client', existingPi.id);

    return {
      clientSecret: existingPi.client_secret,
      paymentIntentId: existingPi.id,
      orderId: order.id,
      amount: order.total,
      resumed: true,
    };
  }

  let createdPaymentIntentId: string | null = null;

  try {
    await transitionToPaymentIntentPhase(orderRepo, order, idempotencyKey, 'create_payment_intent_started');

    const { clientSecret, id: paymentIntentId } = await stripe.createPaymentIntent({
      amount: order.total,
      currency: 'usd',
      userId,
      orderId: order.id,
      idempotencyKey,
      metadata: {
        orderId: order.id,
        userId,
        checkoutKey: idempotencyKey || 'none',
        fencingToken: order.metadata?.fencingToken?.toString() || '0',
      },
    });
    createdPaymentIntentId = paymentIntentId;

    await orderRepo.updatePaymentTransactionId(order.id, paymentIntentId);
    await orderRepo.updateMetadata(order.id, {
      ...(order.metadata || {}),
      currentPhase: 'AWAIT_PAYMENT_CONFIRMATION',
      authoritySource: 'stripe',
      waitingFor: 'webhook',
    });
    await orderRepo.transitionCheckoutAttemptPhase({
      attemptId: idempotencyKey,
      expectedPhases: ['CREATE_OR_RESUME_PAYMENT_INTENT'],
      nextPhase: 'AWAIT_PAYMENT_CONFIRMATION',
      authoritySource: 'stripe',
      waitingFor: 'webhook',
      reason: 'payment_intent_created_and_linked',
      orderId: order.id,
      paymentIntentId,
    }).catch((attemptErr) => {
      logger.error('FATAL: Failed to attach PaymentIntent to checkout attempt. Manual reconciliation required.', {
        orderId: order.id,
        paymentIntentId,
        attemptErr,
      });
    });
    await orderRepo.updateCheckoutAttempt(idempotencyKey, {
      paymentIntentId,
      state: 'payment_intent_created',
    }).catch(() => {});

    return {
      clientSecret,
      paymentIntentId,
      orderId: order.id,
      amount: order.total,
    };
  } catch (stripeErr) {
    logger.error(`CRITICAL: Stripe PI creation failed for order ${order.id}. Rolling back.`, stripeErr);

    if (createdPaymentIntentId) {
      let stripeStatus = 'unknown_after_local_persistence_failure';
      try {
        await stripe.cancelPaymentIntent(createdPaymentIntentId);
        stripeStatus = 'canceled';
      } catch (cancelErr) {
        logger.error(`FATAL: Failed to cancel dangling Stripe PI ${createdPaymentIntentId} for rolled back order ${order.id}. Checking actual status.`, cancelErr);
        try {
          const actualPi = await stripe.getPaymentIntent(createdPaymentIntentId);
          stripeStatus = actualPi.status;
        } catch (getErr) {
          logger.error(`Failed to fetch status for dangling PI ${createdPaymentIntentId}`, getErr);
        }
      }

      await recordPaymentIntentPersistenceFailure(orderRepo, order, idempotencyKey, createdPaymentIntentId, stripeStatus);
    }

    await onRollback(order.id, idempotencyKey, createdPaymentIntentId, 'checkout_payment_intent_creation_rollback');
    throw stripeErr;
  }
}
