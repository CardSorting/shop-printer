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
import { logger } from '@utils/logger';
import { DomainError } from '@domain/errors';
import type { Cart, Order } from '@domain/models';

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
        
        await services.orderService.updateOrderStatus(order.id, 'cancelled', { 
            id: 'system', 
            email: 'system-rollback@dreambees.art' 
        }).catch(rollbackErr => {
            logger.error(`FATAL: Rollback failed for order ${order.id}. Manual reconciliation required.`, rollbackErr);
        });
        await restoreCartAfterUnpaidCheckoutFailure(services, order);

        throw stripeErr;
    }
  } catch (error) {
    return jsonError(error, 'Checkout initiation failed');
  }
}

async function restoreCartAfterUnpaidCheckoutFailure(services: Awaited<ReturnType<typeof getServerServices>>, order: Order): Promise<void> {
    try {
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

        const restored = await services.cartService.restoreCartIfEmpty(restoredCart);
        if (!restored) {
            logger.warn('Skipping checkout cart restore because user already has an active cart', {
                userId: order.userId,
                orderId: order.id,
            });
        }
    } catch (restoreErr) {
        logger.error(`FATAL: Failed to restore cart after unpaid checkout rollback for order ${order.id}.`, restoreErr);
    }
}
