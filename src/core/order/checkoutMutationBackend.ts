import type { Address, Order } from '@domain/models';
import type { FulfillmentMethod } from './types';

export type RunCheckoutReservationParams = {
  userId: string;
  shippingAddress: Address;
  userEmail?: string;
  userName?: string;
  discountCode?: string;
  idempotencyKey?: string;
  paymentMethodId?: string;
  fulfillmentMethod?: FulfillmentMethod;
  lockTtlMs?: number;
};

/**
 * Internal checkout mutation contract. Only CheckoutFlowService should call these.
 */
export interface CheckoutMutationBackend {
  runCheckoutReservation(params: RunCheckoutReservationParams): Promise<Order>;
  confirmStripePayment(paymentIntentId: string, stripePi?: unknown, actor?: string): Promise<Order>;
  rollbackUnpaidCheckout(
    orderId: string,
    checkoutAttemptId: string,
    paymentIntentId: string | null,
    reason: string,
  ): Promise<void>;
}
