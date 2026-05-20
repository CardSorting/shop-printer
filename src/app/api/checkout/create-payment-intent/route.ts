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
    const transition = (services.orderRepo as any).transitionCheckoutAttemptPhase;
    if (typeof transition === 'function') {
        await transition.call(services.orderRepo, params);
        return;
    }
    await services.orderRepo.updateCheckoutAttempt(params.attemptId, {
        currentPhase: params.nextPhase,
        authoritySource: params.authoritySource,
        waitingFor: params.waitingFor,
        lastTransitionAt: new Date().toISOString(),
        lastTransitionReason: params.reason,
        ...(params.paymentIntentId !== undefined ? { paymentIntentId: params.paymentIntentId } : {}),
    });
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

            // Transition payment state and order status to cancelled in RECOVER_OR_RECONCILE phase
            await services.orderRepo.updateMetadata(order.id, {
                ...(order.metadata || {}),
                currentPhase: 'RECOVER_OR_RECONCILE',
                authoritySource: 'local',
                waitingFor: 'none'
            }).catch(() => {});
            await services.orderRepo.transitionPaymentState(order.id, ['unpaid', 'requires_payment_method', 'processing', 'failed'], 'failed', 'high_value_step_up_failure').catch(rollbackErr => {
                logger.error(`FATAL: Payment state rollback failed for high-value order ${order.id}.`, rollbackErr);
            });
            await services.orderRepo.guardedUpdateStatus(order.id, ['pending'], 'cancelled', 'high_value_step_up_failure').catch(rollbackErr => {
                logger.error(`FATAL: Status rollback failed for high-value order ${order.id}.`, rollbackErr);
            });
            await services.orderRepo.updateCheckoutAttempt(idempotencyKey, {
                state: 'cancelled',
                paymentIntentId: null,
                currentPhase: 'RECOVER_OR_RECONCILE',
                authoritySource: 'local',
                waitingFor: 'none'
            }).catch(attemptErr => {
                logger.error(`FATAL: Checkout attempt cancel failed for high-value order ${order.id}.`, attemptErr);
            });

            // Restore physical product stock reservations
            const physicalItems = order.items.filter(item => !item.isDigital);
            if (physicalItems.length > 0 && order.metadata?.inventoryReserved) {
                const { coalesceStockUpdates } = await import('@domain/rules');
                const stockUpdates = coalesceStockUpdates(physicalItems.map(item => ({
                    id: item.productId,
                    variantId: item.variantId,
                    delta: item.quantity
                })));

                if (stockUpdates.length > 0) {
                    await services.productRepo.batchUpdateStock(stockUpdates).catch(stockErr => {
                        logger.error(`FATAL: Failed to restore stock during high-value step-up rollback for order ${order.id}.`, stockErr);
                    });
                }

                // Update metadata so cart restoration can verify stock is released
                await services.orderRepo.updateMetadata(order.id, {
                    ...(order.metadata || {}),
                    inventoryReservationReleased: true,
                    inventoryReservationReleasedAt: new Date().toISOString(),
                    currentPhase: 'RECOVER_OR_RECONCILE',
                    authoritySource: 'local',
                    waitingFor: 'none'
                }).catch(metaErr => {
                    logger.error(`FATAL: Failed to update metadata for stock release during high-value rollback for order ${order.id}.`, metaErr);
                });
            }

            // Restore cart
            const stripeService = new StripeService();
            await restoreCartAfterUnpaidCheckoutFailure(services, stripeService, order, idempotencyKey, null);

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
          await stripeService.cancelPaymentIntent(createdPaymentIntentId).catch(cancelErr => {
            logger.error(`FATAL: Failed to cancel dangling Stripe PI ${createdPaymentIntentId} for rolled back order ${order.id}.`, cancelErr);
          });
          await services.orderRepo.createOrUpdateReconciliationCase({
            paymentIntentId: createdPaymentIntentId,
            orderId: order.id,
            checkoutAttemptId: idempotencyKey,
            reason: 'finalization_failure',
            severity: 'critical',
            stripeStatus: 'unknown_after_local_persistence_failure',
            operatorVisibleMessage: `PaymentIntent ${createdPaymentIntentId} was created for order ${order.id}, but local checkout persistence did not complete.`,
            nextAction: 'Verify the Stripe PaymentIntent terminal state and confirm local rollback or repair the mapping.',
            failureClassification: 'local_persistence_failure',
            lastObservedStripeState: 'created_before_local_failure',
            lastObservedLocalState: `status:${order.status};paymentTransactionId:${order.paymentTransactionId || 'null'}`,
            blockingProductionReadiness: true,
          }).catch(caseErr => {
            logger.error('FATAL: Failed to create local persistence reconciliation case after PaymentIntent side effect', { orderId: order.id, paymentIntentId: createdPaymentIntentId, caseErr });
          });
        }
        
        await services.orderRepo.updateMetadata(order.id, {
          ...(order.metadata || {}),
          currentPhase: 'RECOVER_OR_RECONCILE',
          authoritySource: 'local',
          waitingFor: 'none'
        }).catch(() => {});

        await services.orderRepo.transitionPaymentState(order.id, ['unpaid', 'requires_payment_method', 'processing', 'failed'], createdPaymentIntentId ? 'cancelled' : 'failed', 'checkout_payment_intent_creation_rollback').catch(rollbackErr => {
            logger.error(`FATAL: Payment state rollback failed for order ${order.id}. Manual reconciliation required.`, rollbackErr);
        });
        await services.orderRepo.guardedUpdateStatus(order.id, ['pending'], 'cancelled', 'checkout_payment_intent_creation_rollback').catch(rollbackErr => {
            logger.error(`FATAL: Rollback failed for order ${order.id}. Manual reconciliation required.`, rollbackErr);
        });
        await services.orderRepo.updateCheckoutAttempt(idempotencyKey, {
          state: 'cancelled',
          paymentIntentId: createdPaymentIntentId,
          currentPhase: 'RECOVER_OR_RECONCILE',
          authoritySource: 'local',
          waitingFor: 'none'
        }).catch(attemptErr => {
          logger.error('FATAL: Failed to mark checkout attempt cancelled after unpaid checkout rollback', {
            orderId: order.id,
            paymentIntentId: createdPaymentIntentId,
            attemptErr,
          });
        });
        await restoreCartAfterUnpaidCheckoutFailure(services, stripeService, order, idempotencyKey, createdPaymentIntentId);

        throw stripeErr;
    }
  } catch (error) {
    return jsonError(error, 'Checkout initiation failed');
  }
}

async function restoreCartAfterUnpaidCheckoutFailure(
  services: Awaited<ReturnType<typeof getServerServices>>,
  stripeService: StripeService,
  order: Order,
  checkoutAttemptId: string,
  paymentIntentId: string | null
): Promise<void> {
    try {
        if (paymentIntentId) {
            const pi = await stripeService.getPaymentIntent(paymentIntentId);
            if (!['canceled'].includes(pi.status)) {
                await services.orderRepo.updateCheckoutAttempt(checkoutAttemptId, { state: 'restore_blocked' }).catch(() => {});
                await transitionCheckoutAttempt(services, {
                    attemptId: checkoutAttemptId,
                    expectedPhases: ['RECOVER_OR_RECONCILE', 'CREATE_OR_RESUME_PAYMENT_INTENT', 'AWAIT_PAYMENT_CONFIRMATION'],
                    nextPhase: 'RECOVER_OR_RECONCILE',
                    authoritySource: 'operator',
                    waitingFor: 'operator',
                    reason: 'cart_restore_blocked_by_stripe_state',
                    orderId: order.id,
                    paymentIntentId,
                }).catch(() => {});
                await services.orderRepo.createOrUpdateReconciliationCase({
                    paymentIntentId,
                    orderId: order.id,
                    checkoutAttemptId,
                    reason: pi.status === 'succeeded' ? 'paid_not_finalized' : 'dangling_payment_intent',
                    severity: 'critical',
                    stripeStatus: pi.status,
                    operatorVisibleMessage: `Checkout rollback for order ${order.id} could not safely restore cart because PaymentIntent ${paymentIntentId} is ${pi.status}.`,
                    nextAction: 'Inspect Stripe payment state before restoring cart, cancelling, fulfilling, or refunding.',
                    details: { restoreBlocked: true },
                    failureClassification: pi.status === 'succeeded' ? 'stripe_local_mismatch' : 'operator_required',
                    lastObservedStripeState: pi.status,
                    lastObservedLocalState: `status:${order.status};paymentState:${order.paymentState || 'unknown'}`,
                    blockingProductionReadiness: true,
                }).catch(caseErr => {
                    logger.error('FATAL: Failed to record restore-blocked reconciliation case', { orderId: order.id, paymentIntentId, caseErr });
                });
                logger.warn('Skipping checkout cart restore because PaymentIntent is not safely cancelled', {
                    userId: order.userId,
                    orderId: order.id,
                    paymentIntentId,
                    stripeStatus: pi.status,
                });
                const audit = new AuditService();
                await audit.record({
                    userId: order.userId,
                    userEmail: order.customerEmail || 'unknown@dreambees.art',
                    action: 'checkout_rollback_failed',
                    targetId: order.id,
                    details: { reason: 'payment_intent_not_canceled', stripeStatus: pi.status, paymentIntentId },
                    correlationId: checkoutAttemptId || undefined
                }).catch(() => {});
                return;
            }
        }

        const restoredCart: Cart = {
            id: order.userId,
            userId: order.userId,
            items: order.items.map(item => ({
                productId: item.productId,
                variantId: item.variantId,
                variantTitle: item.variantTitle,
                productHandle: item.productHandle,
                name: item.name,
                priceSnapshot: item.unitPrice,
                quantity: item.quantity,
                imageUrl: item.imageUrl || '',
                isDigital: item.isDigital,
                shippingClassId: item.shippingClassId,
            })),
            note: order.customerNote,
            updatedAt: new Date(),
        };

        const restored = await runTransaction(getUnifiedDb(), async (transaction: any) => {
            const currentOrder = await services.orderRepo.getById(order.id, transaction);
            if (!currentOrder) return { ok: false, reason: 'order_missing' };

            const finalizedStatuses: OrderStatus[] = ['confirmed', 'processing', 'shipped', 'delivered', 'ready_for_pickup', 'delivery_started', 'refunded', 'partially_refunded'];
            if (finalizedStatuses.includes(currentOrder.status)) return { ok: false, reason: 'order_finalized' };
            if (currentOrder.status !== 'cancelled') return { ok: false, reason: `order_status_${currentOrder.status}` };
            if (currentOrder.paymentTransactionId && currentOrder.paymentTransactionId !== paymentIntentId) return { ok: false, reason: 'payment_intent_mismatch' };
            if (currentOrder.metadata?.inventoryReserved && !currentOrder.metadata?.inventoryReservationReleased) return { ok: false, reason: 'reservation_still_active' };

            const attempt = await services.orderRepo.getCheckoutAttempt(checkoutAttemptId, transaction);
            if (!attempt) return { ok: false, reason: 'attempt_missing' };
            if (attempt.orderId !== order.id) return { ok: false, reason: 'attempt_order_mismatch' };
            if (attempt.state === 'paid') return { ok: false, reason: 'attempt_paid' };
            if (attempt.paymentIntentId && attempt.paymentIntentId !== paymentIntentId) return { ok: false, reason: 'attempt_payment_intent_mismatch' };
            if (attempt.fencingToken !== (currentOrder.metadata?.fencingToken ?? null)) return { ok: false, reason: 'fencing_token_mismatch' };
            if (attempt.cartOwnerId !== currentOrder.id) return { ok: false, reason: 'cart_owner_mismatch' };

            const latestAttempt = await services.orderRepo.getLatestCheckoutAttemptForUser(order.userId, transaction);
            if (latestAttempt && latestAttempt.idempotencyKey !== checkoutAttemptId) return { ok: false, reason: 'newer_checkout_attempt_exists' };

            const existingCart = await services.cartRepo.getByUserId(order.userId, transaction);
            if (existingCart && existingCart.items.length > 0) return { ok: false, reason: 'cart_not_empty' };

            await services.cartRepo.save(restoredCart, transaction);
            await services.orderRepo.updateCheckoutAttempt(checkoutAttemptId, { state: 'restored' }, transaction);
            
            const audit = new AuditService();
            await audit.recordWithTransaction(transaction, {
                userId: order.userId,
                userEmail: order.customerEmail || 'unknown@dreambees.art',
                action: 'checkout_rollback_success',
                targetId: order.id,
                details: { checkoutAttemptId, cartItemsCount: restoredCart.items.length },
                correlationId: checkoutAttemptId || undefined
            });

            return { ok: true, reason: 'restored' };
        });

        if (!restored.ok) {
            await services.orderRepo.updateCheckoutAttempt(checkoutAttemptId, { state: 'restore_blocked' }).catch(() => {});
            logger.warn('cart_restore_rejected', {
                userId: order.userId,
                orderId: order.id,
                checkoutAttemptId,
                reason: restored.reason,
            });
            logger.warn('Skipping checkout cart restore because restore guard failed', {
                userId: order.userId,
                orderId: order.id,
                reason: restored.reason,
            });
            const audit = new AuditService();
            await audit.record({
                userId: order.userId,
                userEmail: order.customerEmail || 'unknown@dreambees.art',
                action: 'checkout_rollback_failed',
                targetId: order.id,
                details: { reason: restored.reason, checkoutAttemptId },
                correlationId: checkoutAttemptId || undefined
            }).catch(() => {});
        }
    } catch (restoreErr) {
        logger.error(`FATAL: Failed to restore cart after unpaid checkout rollback for order ${order.id}.`, restoreErr);
    }
}
