import type { IOrderRepository } from '@domain/repositories';
import type { Order } from '@domain/models';
import { DomainError } from '@domain/errors';
import { logger } from '@utils/logger';

export type CheckoutOrderResolutionSource = 'payment_transaction_id' | 'stripe_metadata';

export type CheckoutOrderResolution =
  | {
      found: true;
      order: Order;
      source: CheckoutOrderResolutionSource;
      linkedPaymentTransaction: boolean;
    }
  | {
      found: false;
      reason: 'not_found' | 'mapping_mismatch';
      orderId?: string;
      existingPaymentIntentId?: string;
    };

export type ResolveCheckoutOrderOptions = {
  stripeMetadataOrderId?: string | null;
  transaction?: any;
  linkMissingPaymentTransaction?: boolean;
};

/**
 * Single lookup path for checkout order resolution. Callers should use this
 * instead of re-implementing paymentTransactionId -> metadata.orderId chains.
 */
export async function resolveCheckoutOrderByPaymentIntent(
  orderRepo: IOrderRepository,
  paymentIntentId: string,
  options: ResolveCheckoutOrderOptions = {}
): Promise<CheckoutOrderResolution> {
  let order: Order | null = null;

  if (options.transaction && typeof orderRepo.getByPaymentTransactionIdTransactional === 'function') {
    order = await orderRepo.getByPaymentTransactionIdTransactional(paymentIntentId, options.transaction);
  } else if (typeof orderRepo.getByPaymentTransactionId === 'function') {
    order = await orderRepo.getByPaymentTransactionId(paymentIntentId);
  }

  if (order) {
    return {
      found: true,
      order,
      source: 'payment_transaction_id',
      linkedPaymentTransaction: false,
    };
  }

  const metadataOrderId = options.stripeMetadataOrderId?.trim();
  if (!metadataOrderId) {
    return { found: false, reason: 'not_found' };
  }

  const fallbackOrder = await orderRepo.getById(metadataOrderId, options.transaction);
  if (!fallbackOrder) {
    return { found: false, reason: 'not_found' };
  }

  if (fallbackOrder.paymentTransactionId && fallbackOrder.paymentTransactionId !== paymentIntentId) {
    return {
      found: false,
      reason: 'mapping_mismatch',
      orderId: fallbackOrder.id,
      existingPaymentIntentId: fallbackOrder.paymentTransactionId,
    };
  }

  if (options.linkMissingPaymentTransaction && !fallbackOrder.paymentTransactionId) {
    await orderRepo.updatePaymentTransactionId(fallbackOrder.id, paymentIntentId, options.transaction);
    logger.info('checkout_order_resolver_linked_payment_intent', {
      paymentIntentId,
      orderId: fallbackOrder.id,
      via: 'stripe_metadata',
    });
    return {
      found: true,
      order: { ...fallbackOrder, paymentTransactionId: paymentIntentId },
      source: 'stripe_metadata',
      linkedPaymentTransaction: true,
    };
  }

  return {
    found: true,
    order: fallbackOrder,
    source: 'stripe_metadata',
    linkedPaymentTransaction: false,
  };
}

export function assertCheckoutOrderMetadataMatch(
  order: Order,
  stripeMetadataOrderId?: string | null
): void {
  if (stripeMetadataOrderId && stripeMetadataOrderId !== order.id) {
    throw new DomainError('Payment intent metadata does not match this order.');
  }
}
