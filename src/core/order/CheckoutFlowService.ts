import type { ICheckoutGateway, IOrderRepository } from '@domain/repositories';
import type { Address, Order } from '@domain/models';
import type { CheckoutMutationBackend } from './checkoutMutationBackend';
import {
  type CheckoutStripePort,
  type ClientPaymentIntentResult,
} from './checkoutPaymentIntentFlow';
import { resolveCheckoutOrderByPaymentIntent } from './checkoutOrderResolver';
import { verifyPaymentFromClientFlow } from './checkoutVerifyFlow';
import { handleStripePaymentFailedFlow } from './checkoutStripeWebhookFlow';
import { startClientCheckoutFlow } from './checkoutClientStartFlow';
import { completeCheckoutWithPaymentMethod } from './checkoutPaymentMethodFlow';
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

/**
 * Single checkout orchestration surface. Routes and webhooks should call this
 * instead of composing checkout mutation primitives directly.
 */
export class CheckoutFlowService {
  static readonly HIGH_VALUE_THRESHOLD_CENTS = 100_000;

  constructor(
    private readonly mutations: CheckoutMutationBackend,
    private readonly orderRepo: IOrderRepository,
    private readonly checkoutGateway?: ICheckoutGateway,
  ) {}

  startClientCheckout(params: StartClientCheckoutParams): Promise<ClientPaymentIntentResult> {
    return startClientCheckoutFlow({
      mutations: this.mutations,
      orderRepo: this.orderRepo,
      input: params,
      highValueThresholdCents: CheckoutFlowService.HIGH_VALUE_THRESHOLD_CENTS,
      onRollback: (orderId, checkoutAttemptId, paymentIntentId, reason) =>
        this.rollbackUnpaidCheckout(orderId, checkoutAttemptId, paymentIntentId, reason),
    });
  }

  reserveCheckout(params: ReserveCheckoutParams): Promise<Order> {
    return this.mutations.runCheckoutReservation({
      userId: params.userId,
      shippingAddress: params.shippingAddress,
      userEmail: params.userEmail,
      userName: params.userName,
      discountCode: params.discountCode,
      idempotencyKey: params.idempotencyKey,
      fulfillmentMethod: params.fulfillmentMethod,
      lockTtlMs: params.lockTtlMs,
    });
  }

  completeWithPaymentMethod(params: CompleteWithPaymentMethodParams): Promise<Order> {
    return completeCheckoutWithPaymentMethod({
      mutations: this.mutations,
      checkoutGateway: this.checkoutGateway,
      input: params,
    });
  }

  confirmPaymentFromStripe(
    paymentIntentId: string,
    stripePi?: StripePaymentIntentSnapshot,
    actor?: string
  ): Promise<Order> {
    return this.mutations.confirmStripePayment(paymentIntentId, stripePi, actor);
  }

  verifyPaymentFromClient(
    userId: string,
    paymentIntentId: string,
    stripePi: StripePaymentIntentSnapshot
  ): Promise<{ success: boolean; orderId?: string; status?: string; message?: string }> {
    return verifyPaymentFromClientFlow({
      orderRepo: this.orderRepo,
      userId,
      paymentIntentId,
      stripePi,
      confirmPayment: (pi, piSnapshot, confirmActor) => this.confirmPaymentFromStripe(pi, piSnapshot, confirmActor),
    });
  }

  resolveOrder(paymentIntentId: string, options?: ResolveCheckoutOrderOptions) {
    return resolveCheckoutOrderByPaymentIntent(this.orderRepo, paymentIntentId, options);
  }

  rollbackUnpaidCheckout(
    orderId: string,
    checkoutAttemptId: string,
    paymentIntentId: string | null,
    reason: string
  ): Promise<void> {
    return this.mutations.rollbackUnpaidCheckout(orderId, checkoutAttemptId, paymentIntentId, reason);
  }

  handleStripePaymentFailed(params: {
    paymentIntent: StripePaymentIntentSnapshot;
    currentPaymentIntent: StripePaymentIntentSnapshot;
  }): Promise<StripePaymentFailedResult> {
    return handleStripePaymentFailedFlow({
      ...params,
      deps: {
        orderRepo: this.orderRepo,
        confirmPayment: (pi, piSnapshot, confirmActor) => this.confirmPaymentFromStripe(pi, piSnapshot, confirmActor),
        rollbackUnpaidCheckout: (orderId, attemptId, pi, reason) =>
          this.rollbackUnpaidCheckout(orderId, attemptId, pi, reason),
      },
    });
  }
}
