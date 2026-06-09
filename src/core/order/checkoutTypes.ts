import type { Address } from '@domain/models';

export type ReconciliationOperatorAction =
  | 'mark_resolved'
  | 'retry_recovery'
  | 'initiate_refund_review'
  | 'acknowledge_external'
  | 'escalate';
import type { CheckoutStripePort } from './checkoutPaymentIntentFlow';
import type { FulfillmentMethod } from './types';

export type StartClientCheckoutParams = {
  userId: string;
  shippingAddress: Address;
  idempotencyKey: string;
  stripe: CheckoutStripePort;
  userEmail?: string;
  userName?: string;
  discountCode?: string;
  requireHighValueStepUp?: () => Promise<void>;
};

export type CompleteWithPaymentMethodParams = {
  userId: string;
  shippingAddress: Address;
  paymentMethodId: string;
  idempotencyKey?: string;
  discountCode?: string;
  userEmail?: string;
  userName?: string;
  fulfillmentMethod?: FulfillmentMethod;
};

export type ReserveCheckoutParams = {
  userId: string;
  shippingAddress: Address;
  idempotencyKey?: string;
  userEmail?: string;
  userName?: string;
  discountCode?: string;
  fulfillmentMethod?: FulfillmentMethod;
  lockTtlMs?: number;
};

export type ResolveCheckoutOrderOptions = {
  stripeMetadataOrderId?: string | null;
  linkMissingPaymentTransaction?: boolean;
};

export type StripePaymentIntentSnapshot = {
  id: string;
  status: string;
  metadata?: Record<string, string>;
};

export type StripePaymentFailedResult =
  | { action: 'finalized'; orderId: string }
  | { action: 'rolled_back'; orderId: string }
  | { action: 'ignored'; reason: string };

export type CheckoutStripeLookupPort = {
  getPaymentIntent: (paymentIntentId: string) => Promise<StripePaymentIntentSnapshot>;
};
