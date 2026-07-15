import type { IOrderRepository } from '@domain/repositories';
import type { Order } from '@domain/models';
import type { StripeService } from '@infrastructure/services/StripeService';
import type { CheckoutMutationBackend } from './checkoutMutationBackend';
import {
  type CheckoutStripePort,
  type ClientPaymentIntentResult,
} from './checkoutPaymentIntentFlow';
import { resolveCheckoutOrderByPaymentIntent } from './checkoutOrderResolver';
import { verifyPaymentFromClientFlow } from './checkoutVerifyFlow';
import { handleStripePaymentFailedFlow } from './checkoutStripeWebhookFlow';
import { startClientCheckoutFlow } from './checkoutClientStartFlow';
import { cleanupExpiredPendingOrdersFlow } from './checkoutCleanupFlow';
import {
  completeOperatorRetryRecoveryFlow,
  handleReconciliationOperatorActionFlow,
} from './checkoutOperatorFlow';
import { handleCheckoutWebhookFlow } from './checkoutWebhookIngressFlow';
import type { ICheckoutEventLog } from './checkoutEventLog';
import { transitionCheckoutOrderState } from './checkoutOrderState';
import {
  checkoutErr,
  checkoutFromError,
  checkoutOk,
  checkoutTry,
  type CheckoutResult,
} from './checkoutResult';
import type {
  CheckoutApplicationService,
  CleanupExpiredPendingOrdersInput,
  CleanupExpiredPendingOrdersReport,
  CreateCheckoutSessionData,
  CreateCheckoutSessionInput,
  HandleCheckoutWebhookData,
  HandleCheckoutWebhookInput,
  HandleOperatorActionData,
  HandleOperatorActionInput,
  RecoverPendingOrderData,
  RecoverPendingOrderInput,
} from './checkoutApplicationService';
import type {
  ReconciliationOperatorAction,
  ReserveCheckoutParams,
  ResolveCheckoutOrderOptions,
  StartClientCheckoutParams,
  StripePaymentFailedResult,
  StripePaymentIntentSnapshot,
} from './checkoutTypes';

export type CheckoutFlowServiceOptions = {
  stripe?: CheckoutStripePort & Pick<StripeService, 'constructEvent' | 'tryProcessEvent' | 'getEventStatus' | 'markEventProcessed' | 'markEventFailed'>;
  eventLog?: ICheckoutEventLog;
  cancelExpiredPendingOrder?: (orderId: string) => Promise<void>;
  recordOperatorAction?: (input: {
    caseId: string;
    action: ReconciliationOperatorAction;
    reason: string;
    actor: { id: string; email: string };
  }) => Promise<void>;
};

export type {
  ReserveCheckoutParams,
  ResolveCheckoutOrderOptions,
  StartClientCheckoutParams,
  StripePaymentFailedResult,
  StripePaymentIntentSnapshot,
} from './checkoutTypes';

/**
 * Checkout orchestration service. Implements CheckoutApplicationService for routes;
 * internal flows and tests may call lower-level helpers on this class.
 */
export class CheckoutFlowService implements CheckoutApplicationService {
  static readonly HIGH_VALUE_THRESHOLD_CENTS = 100_000;

  constructor(
    private readonly mutations: CheckoutMutationBackend,
    private readonly orderRepo: IOrderRepository,
    private readonly options: CheckoutFlowServiceOptions = {},
  ) {}

  private get stripe() {
    return this.options.stripe;
  }

  private get eventLog() {
    return this.options.eventLog;
  }

  async createCheckoutSession(
    input: CreateCheckoutSessionInput,
  ): Promise<CheckoutResult<CreateCheckoutSessionData>> {
    const stripe = this.stripe;
    if (!stripe) {
      return checkoutErr('STRIPE_NOT_CONFIGURED', 'Stripe is not configured on the checkout stack', true);
    }
    return checkoutTry(() => this.startClientCheckout({
      userId: input.userId,
      shippingAddress: input.shippingAddress,
      idempotencyKey: input.idempotencyKey,
      userEmail: input.userEmail,
      userName: input.userName,
      discountCode: input.discountCode,
      requireHighValueStepUp: input.requireHighValueStepUp,
      stripe,
    }));
  }

  async handleCheckoutWebhook(
    input: HandleCheckoutWebhookInput,
  ): Promise<CheckoutResult<HandleCheckoutWebhookData>> {
    if (!this.stripe) {
      return checkoutErr('STRIPE_NOT_CONFIGURED', 'Stripe is not configured on the checkout stack', true);
    }
    try {
      const ingress = await handleCheckoutWebhookFlow(input, {
        stripe: this.stripe,
        confirmPaymentFromStripe: (pi, snapshot, actor, stripeEventId) =>
          this.confirmPaymentFromStripe(pi, snapshot, actor, stripeEventId),
        handleStripePaymentFailed: (params) => this.handleStripePaymentFailed(params),
      });

      if (ingress.status === 400) {
        return checkoutErr('WEBHOOK_INVALID_SIGNATURE', String(ingress.body.error ?? 'Invalid webhook'), false);
      }
      if (ingress.status === 503) {
        return checkoutErr('WEBHOOK_IN_PROGRESS', 'Webhook event is already being processed', true);
      }
      if (ingress.status >= 500) {
        return checkoutErr('WEBHOOK_PROCESSING_FAILED', String(ingress.body.error ?? 'Webhook processing failed'), true);
      }

      return checkoutOk(
        {
          httpStatus: ingress.status,
          received: Boolean(ingress.body.received),
          duplicate: ingress.body.duplicate === true,
          retry: ingress.body.retry === true,
        },
        ingress.body.duplicate === true,
      );
    } catch (error) {
      return checkoutFromError(error);
    }
  }

  async handleReconciliationOperatorAction(
    input: HandleOperatorActionInput,
  ): Promise<CheckoutResult<HandleOperatorActionData>> {
    const recordOperatorAction = this.options.recordOperatorAction;
    const eventLog = this.eventLog;
    if (!recordOperatorAction || !eventLog) {
      return checkoutErr('OPERATOR_NOT_CONFIGURED', 'Operator reconciliation is not configured on the checkout stack', true);
    }

    try {
      const result = await handleReconciliationOperatorActionFlow({
        caseId: input.caseId,
        action: input.action,
        reason: input.reason,
        actor: input.actor,
        eventLog,
        recordOperatorAction,
        runRetryRecovery: (recoveryInput) => this.completeOperatorRetryRecovery(recoveryInput),
      });
      return checkoutOk({ applied: true }, result.duplicate);
    } catch (error) {
      return checkoutErr(
        'OPERATOR_ACTION_FAILED',
        error instanceof Error ? error.message : 'Operator action failed',
        false,
      );
    }
  }

  async cleanupExpiredPendingOrders(
    input: CleanupExpiredPendingOrdersInput,
  ): Promise<CheckoutResult<CleanupExpiredPendingOrdersReport>> {
    const stripe = this.stripe;
    if (!stripe) {
      return checkoutErr('STRIPE_NOT_CONFIGURED', 'Stripe is not configured on the checkout stack', true);
    }
    const cancelExpiredOrder = this.options.cancelExpiredPendingOrder;
    if (!cancelExpiredOrder) {
      return checkoutErr('CLEANUP_NOT_CONFIGURED', 'Order cancellation is not configured on the checkout stack', true);
    }

    return checkoutTry(() => cleanupExpiredPendingOrdersFlow(input.maxAgeMinutes, {
      orderRepo: this.orderRepo,
      stripe,
      confirmPayment: (pi, piSnapshot, actor) => this.confirmPaymentFromStripe(pi, piSnapshot, actor),
      cancelExpiredOrder,
    }));
  }

  async recoverPendingOrder(
    input: RecoverPendingOrderInput,
  ): Promise<CheckoutResult<RecoverPendingOrderData>> {
    const stripe = this.stripe;
    if (!stripe) {
      return checkoutErr('STRIPE_NOT_CONFIGURED', 'Stripe is not configured on the checkout stack', true);
    }
    try {
      const pi = await stripe.getPaymentIntent(input.paymentIntentId);
      const verification = await this.verifyPaymentFromClient(
        input.userId,
        input.paymentIntentId,
        pi as StripePaymentIntentSnapshot,
      );
      if (!verification.success) {
        return checkoutOk({
          success: false,
          orderId: verification.orderId,
          status: verification.status,
          message: verification.message ?? 'Payment verification is still pending.',
        });
      }
      return checkoutOk({
        success: true,
        orderId: verification.orderId,
        status: verification.status,
        message: verification.message,
      });
    } catch (error) {
      return checkoutFromError(error);
    }
  }

  startClientCheckout(params: StartClientCheckoutParams): Promise<ClientPaymentIntentResult> {
    if (!params.stripe && !this.stripe) {
      throw new Error('Stripe is not configured on the checkout stack');
    }
    return startClientCheckoutFlow({
      mutations: this.mutations,
      orderRepo: this.orderRepo,
      input: { ...params, stripe: params.stripe ?? this.stripe! },
      highValueThresholdCents: CheckoutFlowService.HIGH_VALUE_THRESHOLD_CENTS,
      onRollback: (orderId, checkoutAttemptId, paymentIntentId, reason) =>
        this.rollbackUnpaidCheckout(orderId, checkoutAttemptId, paymentIntentId, reason),
      onSessionCreated: (orderId, paymentIntentId) =>
        transitionCheckoutOrderState({
          orderRepo: this.orderRepo,
          orderId,
          from: null,
          to: 'checkout_session_created',
          reason: 'payment_intent_ready',
          source: 'create_checkout_session',
          paymentIntentId,
        }),
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

  confirmPaymentFromStripe(
    paymentIntentId: string,
    stripePi?: StripePaymentIntentSnapshot,
    actor?: string,
    stripeEventId?: string,
  ): Promise<Order> {
    const orderPromise = this.mutations.confirmStripePayment(paymentIntentId, stripePi, actor);
    if (!stripeEventId) return orderPromise;

    return orderPromise.then(async (order) => {
      await transitionCheckoutOrderState({
        orderRepo: this.orderRepo,
        orderId: order.id,
        from: ['checkout_session_created', 'recovery_pending', 'pending_payment', 'reconciliation_required'],
        to: 'paid',
        reason: 'stripe_payment_confirmed',
        source: actor || 'stripe',
        stripeEventId,
        paymentIntentId,
      });
      return order;
    });
  }

  verifyPaymentFromClient(
    userId: string,
    paymentIntentId: string,
    stripePi: StripePaymentIntentSnapshot
  ): Promise<RecoverPendingOrderData> {
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
    stripeEventId?: string;
  }): Promise<StripePaymentFailedResult> {
    return handleStripePaymentFailedFlow({
      paymentIntent: params.paymentIntent,
      currentPaymentIntent: params.currentPaymentIntent,
      deps: {
        orderRepo: this.orderRepo,
        confirmPayment: (pi, piSnapshot, confirmActor) =>
          this.confirmPaymentFromStripe(pi, piSnapshot, confirmActor, params.stripeEventId),
        rollbackUnpaidCheckout: (orderId, attemptId, pi, reason) =>
          this.rollbackUnpaidCheckout(orderId, attemptId, pi, reason),
      },
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
  }): Promise<{ duplicate?: boolean }> {
    const eventLog = this.eventLog;
    if (!eventLog) {
      throw new Error('Checkout event log is not configured on the checkout stack');
    }
    return completeOperatorRetryRecoveryFlow({
      orderRepo: this.orderRepo,
      eventLog,
      caseId: params.caseId,
      reason: params.reason,
      actor: params.actor,
      confirmPayment: (pi, _stripePi, actor) => this.confirmPaymentFromStripe(pi, undefined, actor),
      markCaseResolved: params.markCaseResolved,
    });
  }
}
