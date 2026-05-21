import { NextResponse } from 'next/server';
import { getServerServices } from '@infrastructure/server/services';
import { 
    assertRateLimit, 
    jsonError, 
    readJsonObject, 
    requireSessionUser, 
    requireStepUpSessionUser,
    parseShippingAddress, 
    optionalString,
    requireIdempotencyKey
} from '@infrastructure/server/apiGuards';
import { StripeService } from '@infrastructure/services/StripeService';
import { AuditService } from '@core/AuditService';
import { getUnifiedDb, runTransaction } from '@infrastructure/firebase/bridge';
import { logger } from '@utils/logger';
import { DomainError } from '@domain/errors';
import type { Cart, CheckoutAuthoritySource, CheckoutWaitingFor, CheckoutWorkflowPhase, Order, OrderStatus } from '@domain/models';

async function transitionCheckoutAttempt(
    services: Awaited<ReturnType<typeof getServerServices>>,
    params: {
        attemptId: string;
        expectedPhases: CheckoutWorkflowPhase[];
        nextPhase: CheckoutWorkflowPhase;
        authoritySource: CheckoutAuthoritySource;
        waitingFor: CheckoutWaitingFor;
        reason: string;
        orderId?: string | null;
        paymentIntentId?: string | null;
    }
) {
    await services.orderRepo.transitionCheckoutAttemptPhase(params);
}

/**
 * [LAYER: INTERFACE]
 * Production-Hardened Payment Intent Route with Forensic Rollback
 */
export async function POST(request: Request) {
  try {
    // 1. Production Gates
    const user = await requireSessionUser();
    await assertRateLimit(request, 'checkout_init', 5, 60000); // 5 attempts per minute (IP/fingerprint)
    await assertRateLimit(request, 'checkout_init_user', 3, 60000, user.id); // 3 attempts per minute (User Account-bound)

    const services = await getServerServices();
    const body = await readJsonObject(request);
    
    const shippingAddress = parseShippingAddress(body.shippingAddress);
    const discountCode = optionalString(body.discountCode, 'discountCode');
    const idempotencyKey = requireIdempotencyKey(body.idempotencyKey);
    
    // 2. Initiate checkout (Deduct stock, create PENDING order)
    // Wrapped in a DB transaction inside the service
    let order;
    try {
        order = await services.orderService.initiateCheckout(
            user.id,
            shippingAddress,
            user.email,        // userEmail
            user.displayName,  // userName
            discountCode,      // discountCode
            idempotencyKey     // idempotencyKey
        );
    } catch (err) {
        return jsonError(err, 'Failed to reserve inventory for checkout');
    }

    // 2.5 High-Value Checkout Gate ($1,000 / 100,000 cents threshold)
    const HIGH_VALUE_THRESHOLD = 100000;
    if (order.total >= HIGH_VALUE_THRESHOLD) {
        try {
            await requireStepUpSessionUser(request, 5 * 60 * 1000); // Require re-auth within last 5 minutes
        } catch (stepUpErr) {
            logger.warn('Step-up verification failed for high-value order checkout. Triggering forensic rollback.', {
                userId: user.id,
                orderId: order.id,
                total: order.total
            });

            await services.orderService.rollbackUnpaidCheckout(
                order.id,
                idempotencyKey,
                null,
                'high_value_step_up_failure'
            );

            return jsonError(stepUpErr, 'High-value checkout requires a fresh session.');
        }
    }

    if (order.status !== 'pending') {
        throw new DomainError(`Checkout reservation is no longer payable (status: ${order.status}). Please start a new checkout.`);
    }

    // 3. Create Stripe Payment Intent
    const stripeService = new StripeService();
    let createdPaymentIntentId: string | null = null;
    if (order.paymentTransactionId) {
        const existingPi = await stripeService.getPaymentIntent(order.paymentTransactionId);
        if (existingPi.metadata?.orderId && existingPi.metadata.orderId !== order.id) {
            throw new DomainError('Existing payment intent metadata does not match this checkout reservation.');
        }
        if (existingPi.amount !== order.total) {
            throw new DomainError('Existing payment intent amount does not match this checkout reservation.');
        }
        if (!existingPi.client_secret) {
            throw new DomainError('Existing payment intent cannot be resumed.');
        }

        // Resume: CREATE_OR_RESUME_PAYMENT_INTENT
        await services.orderRepo.updateMetadata(order.id, {
          ...(order.metadata || {}),
          currentPhase: 'CREATE_OR_RESUME_PAYMENT_INTENT',
          authoritySource: 'local',
          waitingFor: 'none'
        });
        await transitionCheckoutAttempt(services, {
          attemptId: idempotencyKey,
          expectedPhases: ['INITIALIZE_ORDER', 'CREATE_OR_RESUME_ATTEMPT'],
          nextPhase: 'CREATE_OR_RESUME_PAYMENT_INTENT',
          authoritySource: 'local',
          waitingFor: 'none',
          reason: 'resume_existing_payment_intent',
          orderId: order.id,
          paymentIntentId: existingPi.id
        }).catch(err => {
          logger.info('checkout_resume_phase_already_advanced', { orderId: order.id, paymentIntentId: existingPi.id, err });
        });

        // Set Phase 6: AWAIT_PAYMENT_CONFIRMATION before returning
        await services.orderRepo.updateMetadata(order.id, {
          ...(order.metadata || {}),
          currentPhase: 'AWAIT_PAYMENT_CONFIRMATION',
          authoritySource: 'stripe',
          waitingFor: 'webhook'
        });
        await transitionCheckoutAttempt(services, {
          attemptId: idempotencyKey,
          expectedPhases: ['CREATE_OR_RESUME_PAYMENT_INTENT', 'AWAIT_PAYMENT_CONFIRMATION'],
          nextPhase: 'AWAIT_PAYMENT_CONFIRMATION',
          authoritySource: 'stripe',
          waitingFor: 'webhook',
          reason: 'existing_payment_intent_returned_to_client',
          orderId: order.id,
          paymentIntentId: existingPi.id
        });

        return NextResponse.json({
          clientSecret: existingPi.client_secret,
          paymentIntentId: existingPi.id,
          orderId: order.id,
          amount: order.total,
          resumed: true,
        });
    }

    try {
        // Transition to CREATE_OR_RESUME_PAYMENT_INTENT phase
        await services.orderRepo.updateMetadata(order.id, {
          ...(order.metadata || {}),
          currentPhase: 'CREATE_OR_RESUME_PAYMENT_INTENT',
          authoritySource: 'local',
          waitingFor: 'none'
        });
        await transitionCheckoutAttempt(services, {
          attemptId: idempotencyKey,
          expectedPhases: ['INITIALIZE_ORDER', 'CREATE_OR_RESUME_ATTEMPT'],
          nextPhase: 'CREATE_OR_RESUME_PAYMENT_INTENT',
          authoritySource: 'local',
          waitingFor: 'none',
          reason: 'create_payment_intent_started',
          orderId: order.id,
        });

        const { clientSecret, id: paymentIntentId } = await stripeService.createPaymentIntent({
          amount: order.total,
          currency: 'usd',
          userId: user.id,
          orderId: order.id,
          idempotencyKey: idempotencyKey, // Crucial for redundant request protection
          metadata: {
            orderId: order.id,
            userId: user.id,
            checkoutKey: idempotencyKey || 'none',
            fencingToken: order.metadata?.fencingToken?.toString() || '0'
          }
        });
        createdPaymentIntentId = paymentIntentId;

        // 4. Update order with actual Payment Intent ID
        await services.orderRepo.updatePaymentTransactionId(order.id, paymentIntentId);
        
        // Transition to AWAIT_PAYMENT_CONFIRMATION phase
        await services.orderRepo.updateMetadata(order.id, {
          ...(order.metadata || {}),
          currentPhase: 'AWAIT_PAYMENT_CONFIRMATION',
          authoritySource: 'stripe',
          waitingFor: 'webhook'
        });
        await transitionCheckoutAttempt(services, {
          attemptId: idempotencyKey,
          expectedPhases: ['CREATE_OR_RESUME_PAYMENT_INTENT'],
          nextPhase: 'AWAIT_PAYMENT_CONFIRMATION',
          authoritySource: 'stripe',
          waitingFor: 'webhook',
          reason: 'payment_intent_created_and_linked',
          orderId: order.id,
          paymentIntentId,
        }).catch(attemptErr => {
          logger.error('FATAL: Failed to attach PaymentIntent to checkout attempt. Manual reconciliation required.', {
            orderId: order.id,
            paymentIntentId,
            attemptErr,
          });
        });
        await services.orderRepo.updateCheckoutAttempt(idempotencyKey, {
          paymentIntentId,
          state: 'payment_intent_created',
        }).catch(() => {});

        return NextResponse.json({
          clientSecret,
          paymentIntentId,
          orderId: order.id,
          amount: order.total,
        });
    } catch (stripeErr) {
        // FORENSIC ROLLBACK: If Stripe fails, we MUST cancel the order and restock immediately in RECOVER_OR_RECONCILE phase
        logger.error(`CRITICAL: Stripe PI creation failed for order ${order.id}. Rolling back.`, stripeErr);

        if (createdPaymentIntentId) {
          let stripeStatus = 'unknown_after_local_persistence_failure';
          try {
            await stripeService.cancelPaymentIntent(createdPaymentIntentId);
            stripeStatus = 'canceled';
          } catch (cancelErr) {
            logger.error(`FATAL: Failed to cancel dangling Stripe PI ${createdPaymentIntentId} for rolled back order ${order.id}. Checking actual status.`, cancelErr);
            try {
              const actualPi = await stripeService.getPaymentIntent(createdPaymentIntentId);
              stripeStatus = actualPi.status;
            } catch (getErr) {
              logger.error(`Failed to fetch status for dangling PI ${createdPaymentIntentId}`, getErr);
            }
          }

          if (stripeStatus === 'succeeded') {
            await services.orderRepo.createOrUpdateReconciliationCase({
              paymentIntentId: createdPaymentIntentId,
              orderId: order.id,
              checkoutAttemptId: idempotencyKey,
              reason: 'paid_not_finalized',
              severity: 'critical',
              stripeStatus: 'succeeded',
              operatorVisibleMessage: `PaymentIntent ${createdPaymentIntentId} succeeded for order ${order.id}, but local checkout persistence did not complete.`,
              nextAction: 'Verify the Stripe PaymentIntent terminal state and confirm local rollback or repair the mapping.',
              failureClassification: 'local_persistence_failure',
              lastObservedStripeState: 'succeeded',
              lastObservedLocalState: `status:${order.status};paymentTransactionId:${order.paymentTransactionId || 'null'}`,
              blockingProductionReadiness: true,
            }).catch(caseErr => {
              logger.error('FATAL: Failed to create local persistence reconciliation case after PaymentIntent side effect', { orderId: order.id, paymentIntentId: createdPaymentIntentId, caseErr });
            });
          } else {
            await services.orderRepo.createOrUpdateReconciliationCase({
              paymentIntentId: createdPaymentIntentId,
              orderId: order.id,
              checkoutAttemptId: idempotencyKey,
              reason: 'finalization_failure',
              severity: 'critical',
              stripeStatus,
              operatorVisibleMessage: `PaymentIntent ${createdPaymentIntentId} was created in status ${stripeStatus} for order ${order.id}, but local checkout persistence did not complete.`,
              nextAction: 'Verify the Stripe PaymentIntent terminal state and confirm local rollback or repair the mapping.',
              failureClassification: 'local_persistence_failure',
              lastObservedStripeState: stripeStatus,
              lastObservedLocalState: `status:${order.status};paymentTransactionId:${order.paymentTransactionId || 'null'}`,
              blockingProductionReadiness: true,
            }).catch(caseErr => {
              logger.error('FATAL: Failed to create local persistence reconciliation case after PaymentIntent side effect', { orderId: order.id, paymentIntentId: createdPaymentIntentId, caseErr });
            });
          }
        }
        
        await services.orderService.rollbackUnpaidCheckout(
            order.id,
            idempotencyKey,
            createdPaymentIntentId,
            'checkout_payment_intent_creation_rollback'
        );

        throw stripeErr;
    }
  } catch (error) {
    return jsonError(error, 'Checkout initiation failed');
  }
}

// Local helper removed. Rollback and cart restoration now fully delegated to OrderCheckoutService.
