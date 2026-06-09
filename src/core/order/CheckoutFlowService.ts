import type { ICheckoutGateway, IOrderRepository } from '@domain/repositories';
import type { Order } from '@domain/models';
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
import { cleanupExpiredPendingOrdersFlow } from './checkoutCleanupFlow';
import {
  completeOperatorRetryRecoveryFlow,
  handleReconciliationOperatorActionFlow,
} from './checkoutOperatorFlow';
import type {
  CheckoutStripeLookupPort,
  CompleteWithPaymentMethodParams,
  ReconciliationOperatorAction,
  ReserveCheckoutParams,
  ResolveCheckoutOrderOptions,
  StartClientCheckoutParams,
  StripePaymentFailedResult,
  StripePaymentIntentSnapshot,
} from './checkoutTypes';

export type CheckoutFlowServiceOptions = {
  checkoutGateway?: ICheckoutGateway;
  cancelExpiredPendingOrder?: (orderId: string) => Promise<void>;
};

export type {
  CompleteWithPaymentMethodParams,
  ReserveCheckoutParams,
  ResolveCheckoutOrderOptions,
  StartClientCheckoutParams,
  StripePaymentFailedResult,
  StripePaymentIntentSnapshot,
} from './checkoutTypes';

/**
 * Single checkout orchestration surface. Routes and webhooks should call this
 * instead of composing checkout mutation primitives directly.
 */
export class CheckoutFlowService {
  static readonly HIGH_VALUE_THRESHOLD_CENTS = 100_000;

  constructor(
    private readonly mutations: CheckoutMutationBackend,
    private readonly orderRepo: IOrderRepository,
    private readonly options: CheckoutFlowServiceOptions = {},
  ) {}

  private get checkoutGateway() {
    return this.options.checkoutGateway;
  }

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

  cleanupExpiredPendingOrders(
    expirationMinutes: number,
    stripe: CheckoutStripeLookupPort,
  ): Promise<{ count: number }> {
    const cancelExpiredOrder = this.options.cancelExpiredPendingOrder;
    if (!cancelExpiredOrder) {
      throw new Error('cancelExpiredPendingOrder is not configured on the checkout stack');
    }
    return cleanupExpiredPendingOrdersFlow(expirationMinutes, {
      orderRepo: this.orderRepo,
      stripe,
      confirmPayment: (pi, piSnapshot, actor) => this.confirmPaymentFromStripe(pi, piSnapshot, actor),
      cancelExpiredOrder,
    });
  }

  handleReconciliationOperatorAction(params: {
    caseId: string;
    action: ReconciliationOperatorAction;
    reason: string;
    actor: { id: string; email: string };
    recordOperatorAction: (input: {
      caseId: string;
      action: ReconciliationOperatorAction;
      reason: string;
      actor: { id: string; email: string };
    }) => Promise<void>;
  }): Promise<void> {
    return handleReconciliationOperatorActionFlow({
      ...params,
      runRetryRecovery: (input) => this.completeOperatorRetryRecovery(input),
    });
  }

  completeOperatorRetryRecovery(params: {
    caseId: string;
    reason: string;
    actor: { id: string; email: string };
    markCaseResolved: (input: {
      caseId: string;
      reason: string;
      actor: { id: string; email: string };
    }) => Promise<void>;
  }): Promise<void> {
    return completeOperatorRetryRecoveryFlow({
      orderRepo: this.orderRepo,
      caseId: params.caseId,
      reason: params.reason,
      actor: params.actor,
      confirmPayment: (pi, _stripePi, actor) => this.confirmPaymentFromStripe(pi, undefined, actor),
      markCaseResolved: params.markCaseResolved,
    });
  }
}
