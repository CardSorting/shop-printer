import { NextResponse } from 'next/server';
import { getServerServices } from '@infrastructure/server/services';
import { 
    assertRateLimit, 
    jsonError, 
    readJsonObject, 
    requireSessionUser, 
    parseShippingAddress, 
    optionalString,
    requireIdempotencyKey
} from '@infrastructure/server/apiGuards';
import { StripeService } from '@infrastructure/services/StripeService';
import { getUnifiedDb, runTransaction } from '@infrastructure/firebase/bridge';
import { logger } from '@utils/logger';
import { DomainError } from '@domain/errors';
import type { Cart, Order, OrderStatus } from '@domain/models';

/**
 * [LAYER: INTERFACE]
 * Production-Hardened Payment Intent Route with Forensic Rollback
 */
export async function POST(request: Request) {
  try {
    // 1. Production Gates
    const user = await requireSessionUser();
    await assertRateLimit(request, 'checkout_init', 5, 60000); // 5 attempts per minute

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

        return NextResponse.json({
          clientSecret: existingPi.client_secret,
          paymentIntentId: existingPi.id,
          orderId: order.id,
          amount: order.total,
          resumed: true,
        });
    }

    try {
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
        await services.orderRepo.updateCheckoutAttempt(idempotencyKey, {
          paymentIntentId,
          state: 'payment_intent_created',
        }).catch(attemptErr => {
          logger.error('FATAL: Failed to attach PaymentIntent to checkout attempt. Manual reconciliation required.', {
            orderId: order.id,
            paymentIntentId,
            attemptErr,
          });
        });

        return NextResponse.json({
          clientSecret,
          paymentIntentId,
          orderId: order.id,
          amount: order.total,
        });
    } catch (stripeErr) {
        // FORENSIC ROLLBACK: If Stripe fails, we MUST cancel the order and restock immediately
        // to prevent inventory "hanging" in a pending state unnecessarily.
        logger.error(`CRITICAL: Stripe PI creation failed for order ${order.id}. Rolling back.`, stripeErr);

        if (createdPaymentIntentId) {
          await stripeService.cancelPaymentIntent(createdPaymentIntentId).catch(cancelErr => {
            logger.error(`FATAL: Failed to cancel dangling Stripe PI ${createdPaymentIntentId} for rolled back order ${order.id}.`, cancelErr);
          });
        }
        
        await services.orderRepo.transitionPaymentState(order.id, ['unpaid', 'requires_payment_method', 'processing', 'failed'], createdPaymentIntentId ? 'cancelled' : 'failed', 'checkout_payment_intent_creation_rollback').catch(rollbackErr => {
            logger.error(`FATAL: Payment state rollback failed for order ${order.id}. Manual reconciliation required.`, rollbackErr);
        });
        await services.orderRepo.guardedUpdateStatus(order.id, ['pending'], 'cancelled', 'checkout_payment_intent_creation_rollback').catch(rollbackErr => {
            logger.error(`FATAL: Rollback failed for order ${order.id}. Manual reconciliation required.`, rollbackErr);
        });
        await services.orderRepo.updateCheckoutAttempt(idempotencyKey, {
          state: 'cancelled',
          paymentIntentId: createdPaymentIntentId,
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
                }).catch(caseErr => {
                    logger.error('FATAL: Failed to record restore-blocked reconciliation case', { orderId: order.id, paymentIntentId, caseErr });
                });
                logger.warn('Skipping checkout cart restore because PaymentIntent is not safely cancelled', {
                    userId: order.userId,
                    orderId: order.id,
                    paymentIntentId,
                    stripeStatus: pi.status,
                });
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
            return { ok: true, reason: 'restored' };
        });

        if (!restored.ok) {
            await services.orderRepo.updateCheckoutAttempt(checkoutAttemptId, { state: 'restore_blocked' }).catch(() => {});
            logger.warn('Skipping checkout cart restore because restore guard failed', {
                userId: order.userId,
                orderId: order.id,
                reason: restored.reason,
            });
        }
    } catch (restoreErr) {
        logger.error(`FATAL: Failed to restore cart after unpaid checkout rollback for order ${order.id}.`, restoreErr);
    }
}
