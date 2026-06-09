import type {
  IDiscountRepository,
  IOrderRepository,
  IProductRepository,
  IShippingRepository,
} from '@domain/repositories';
import type {
  Address,
  CarrierManifest,
  LogisticsPerformance,
  Order,
  OrderFulfillmentEventType,
  OrderNote,
  OrderStatus,
  ShippingLabel,
} from '@domain/models';
import { AuditService } from './AuditService';
import { StripeService } from '@infrastructure/services/StripeService';
import { OrderAdminService } from './order/OrderAdminService';
import type { CheckoutFlowService } from './order/CheckoutFlowService';
import { OrderFulfillmentWorkflowService } from './order/OrderFulfillmentWorkflowService';
import { OrderLogisticsService } from './order/OrderLogisticsService';
import { OrderReadService } from './order/OrderReadService';
import { CHECKOUT_RECOVERY_PHASES } from './order/checkoutWorkflow';
import type { OrderActor } from './order/types';
import { logger } from '@utils/logger';

/**
 * [LAYER: CORE]
 *
 * Compatibility facade for order operations. The implementation is split by
 * concern under `src/core/order/` so checkout, logistics, fulfillment, reads,
 * and admin mutations can evolve independently.
 */
export class OrderService {
  private readonly checkoutFlow: CheckoutFlowService;
  private readonly logisticsService: OrderLogisticsService;
  private readonly fulfillmentWorkflowService: OrderFulfillmentWorkflowService;
  private readonly readService: OrderReadService;
  private readonly adminService: OrderAdminService;

  constructor(
    private orderRepo: IOrderRepository,
    productRepo: IProductRepository,
    discountRepo: IDiscountRepository,
    audit: AuditService,
    checkoutFlow: CheckoutFlowService,
    shippingRepo?: IShippingRepository
  ) {
    this.checkoutFlow = checkoutFlow;
    this.logisticsService = new OrderLogisticsService(this.orderRepo, productRepo);
    this.fulfillmentWorkflowService = new OrderFulfillmentWorkflowService(this.orderRepo);
    this.readService = new OrderReadService(this.orderRepo);
    this.adminService = new OrderAdminService(this.orderRepo, productRepo, discountRepo, audit);
  }

  autoAssignShippingMethod(orderId: string): Promise<{ carrier: string; service: string }> {
    return this.logisticsService.autoAssignShippingMethod(orderId);
  }

  // RETIRED: Labels cannot be created directly in the backend. 
  // Use exportOrdersToPirateShipCsv instead.
  /*
  prepareBatchLabels(orderIds: string[]): Promise<ShippingLabel[]> {
    return this.logisticsService.prepareBatchLabels(orderIds);
  }
  */

  exportOrdersToPirateShipCsv(
    orderIds: string[],
    packageDimensions?: { length: string; width: string; height: string },
    tareWeightLbs?: number
  ): Promise<string> {
    return this.logisticsService.exportOrdersToPirateShipCsv(orderIds, packageDimensions, tareWeightLbs);
  }

  createCarrierManifest(carrier: string, orderIds: string[]): Promise<CarrierManifest> {
    return this.logisticsService.createCarrierManifest(carrier, orderIds);
  }

  getLogisticsPerformanceReport(): Promise<LogisticsPerformance> {
    return this.logisticsService.getLogisticsPerformanceReport();
  }

  advanceFulfillment(orderId: string, trackingNumber?: string, actor?: OrderActor): Promise<void> {
    return this.fulfillmentWorkflowService.advanceFulfillment(orderId, trackingNumber, actor);
  }

  recordFulfillmentEvent(
    orderId: string,
    type: OrderFulfillmentEventType,
    label: string,
    description: string
  ): Promise<void> {
    return this.fulfillmentWorkflowService.recordFulfillmentEvent(orderId, type, label, description);
  }

  resolveReconciliation(
    id: string,
    resolutionAction: OrderStatus,
    reason: string,
    evidence: string,
    actor: OrderActor
  ): Promise<void> {
    return this.adminService.resolveReconciliation(id, resolutionAction, reason, evidence, actor);
  }

  updateOrderStatus(
    id: string,
    status: OrderStatus,
    actor: OrderActor = { id: 'system', email: 'system@woodbine.com' }
  ): Promise<void> {
    return this.adminService.updateOrderStatus(id, status, actor);
  }

  getAllOrders(options?: any): Promise<{ orders: Order[]; nextCursor?: string }> {
    return this.readService.getAllOrders(options);
  }

  getOrdersForCustomerView(userId: string, options?: any): Promise<{ orders: Order[]; nextCursor?: string }> {
    return this.readService.getOrdersForCustomerView(userId, options);
  }

  batchUpdateOrderStatus(ids: string[], status: OrderStatus, actor: OrderActor): Promise<{ updatedIds: string[] }> {
    return this.adminService.batchUpdateOrderStatus(ids, status, actor);
  }

  async cleanupExpiredOrders(expirationMinutes = 60): Promise<{ count: number }> {
    const cutoff = new Date();
    cutoff.setMinutes(cutoff.getMinutes() - expirationMinutes);
    const { orders } = await this.orderRepo.getAll({ status: 'pending', to: cutoff });
    const stripeService = new StripeService();
    let processed = 0;

    for (const order of orders) {
      if (order.paymentTransactionId) {
        try {
          const paymentIntent = await stripeService.getPaymentIntent(order.paymentTransactionId);
          if (paymentIntent.status === 'succeeded') {
            await Promise.resolve((this.orderRepo as any).transitionCheckoutAttemptPhase?.({
              attemptId: order.idempotencyKey || order.metadata?.checkoutAttemptId || order.id,
              expectedPhases: CHECKOUT_RECOVERY_PHASES,
              nextPhase: 'RECOVER_OR_RECONCILE',
              authoritySource: 'stripe',
              waitingFor: 'verification',
              reason: 'cleanup_observed_stripe_success',
              orderId: order.id,
              paymentIntentId: paymentIntent.id,
              actor: 'system',
            })).catch(() => {});
            logger.info('cleanup_finalizing_stripe_succeeded_payment', {
              orderId: order.id,
              paymentIntentId: paymentIntent.id,
              checkoutAttemptId: order.idempotencyKey || order.metadata?.checkoutAttemptId || null,
            });
            await this.checkoutFlow.confirmPaymentFromStripe(paymentIntent.id, paymentIntent, 'system');
            processed++;
            continue;
          }

          if (['processing', 'requires_action', 'requires_capture', 'requires_confirmation'].includes(paymentIntent.status)) {
            logger.warn('cleanup_blocked_by_active_payment_intent', {
              orderId: order.id,
              paymentIntentId: paymentIntent.id,
              stripeStatus: paymentIntent.status,
            });
            await this.orderRepo.createOrUpdateReconciliationCase({
              paymentIntentId: paymentIntent.id,
              orderId: order.id,
              checkoutAttemptId: order.idempotencyKey || order.metadata?.checkoutAttemptId || null,
              reason: 'paid_not_finalized',
              severity: 'high',
              stripeStatus: paymentIntent.status,
              operatorVisibleMessage: `Expired pending order ${order.id} has active Stripe PaymentIntent ${paymentIntent.id} in status ${paymentIntent.status}.`,
              nextAction: 'Wait for Stripe terminal state or manually inspect before cancellation.',
              details: { cleanupBlocked: true, expirationMinutes },
              failureClassification: 'transient_external',
              lastObservedStripeState: paymentIntent.status,
              lastObservedLocalState: `status:${order.status};paymentState:${order.paymentState || 'unknown'}`,
              blockingProductionReadiness: false,
            });
            continue;
          }
        } catch (error) {
          logger.error('cleanup_stripe_lookup_failed', {
            orderId: order.id,
            paymentIntentId: order.paymentTransactionId,
            error,
          });
          await this.orderRepo.createOrUpdateReconciliationCase({
            paymentIntentId: order.paymentTransactionId,
            orderId: order.id,
            checkoutAttemptId: order.idempotencyKey || order.metadata?.checkoutAttemptId || null,
            reason: 'paid_not_finalized',
            severity: 'critical',
            stripeStatus: null,
            operatorVisibleMessage: `Expired pending order ${order.id} could not verify Stripe PaymentIntent ${order.paymentTransactionId} before cancellation.`,
            nextAction: 'Verify Stripe status manually before cancelling, fulfilling, or refunding.',
            details: { error: error instanceof Error ? error.message : 'Unknown Stripe lookup error' },
            failureClassification: 'transient_external',
            lastObservedStripeState: null,
            lastObservedLocalState: `status:${order.status};paymentState:${order.paymentState || 'unknown'}`,
            blockingProductionReadiness: true,
          });
          continue;
        }
      }

      logger.info('cleanup_cancelling_expired_unpaid_order', {
        orderId: order.id,
        checkoutAttemptId: order.idempotencyKey || order.metadata?.checkoutAttemptId || null,
      });
      await this.adminService.updateOrderStatus(order.id, 'cancelled', {
        id: 'system',
        email: 'system@woodbine.com'
      });
      processed++;
    }

    return { count: processed };
  }

  getDigitalAssets(userId: string) {
    return this.readService.getDigitalAssets(userId);
  }

  getOrder(id: string, requestingUserId?: string): Promise<Order | null> {
    return this.readService.getOrder(id, requestingUserId);
  }

  applyDiscountToOrder(orderId: string, code: string, actor: OrderActor): Promise<void> {
    return this.adminService.applyDiscountToOrder(orderId, code, actor);
  }

  updateShippingAddress(orderId: string, address: Address, actor: OrderActor): Promise<void> {
    return this.adminService.updateShippingAddress(orderId, address, actor);
  }

  swapOrderItem(orderId: string, oldProductId: string, newProductId: string, actor: OrderActor): Promise<void> {
    return this.adminService.swapOrderItem(orderId, oldProductId, newProductId, actor);
  }

  upgradeShipping(orderId: string, carrier: string, service: string, actor: OrderActor): Promise<void> {
    return this.adminService.upgradeShipping(orderId, carrier, service, actor);
  }

  setOrderHold(orderId: string, reason: string, actor: OrderActor): Promise<void> {
    return this.adminService.setOrderHold(orderId, reason, actor);
  }

  releaseOrderHold(orderId: string, actor: OrderActor): Promise<void> {
    return this.adminService.releaseOrderHold(orderId, actor);
  }

  addOrderNote(id: string, text: string, actor: OrderActor): Promise<OrderNote> {
    return this.adminService.addOrderNote(id, text, actor);
  }

  updateOrderFulfillment(
    id: string,
    data: { trackingNumber?: string; shippingCarrier?: string },
    actor: OrderActor
  ): Promise<void> {
    return this.adminService.updateOrderFulfillment(id, data, actor);
  }

  getOrders(userId: string, options?: any): Promise<{ orders: Order[]; nextCursor?: string }> {
    return this.readService.getOrders(userId, options);
  }

  getAdminOrder(orderId: string): Promise<Order | null> {
    return this.readService.getAdminOrder(orderId);
  }

  getAdminOverview() {
    return this.readService.getAdminOverview();
  }

  async getRecoveryReadModel(options?: { limit?: number }) {
    const state = await this.orderRepo.getStuckCheckoutStates(options);
    const limit = options?.limit || 50;
    let stuckWebhookClaims: any[] = [];
    try {
      const stripeService = new StripeService();
      stuckWebhookClaims = await stripeService.listStuckWebhookClaims(limit);
    } catch (error) {
      logger.error('recovery_read_model_stuck_webhook_claims_failed', { error });
    }
    const itemFromCase = (reconciliationCase: any) => ({
      type: reconciliationCase.reason,
      severity: reconciliationCase.severity,
      recommendedAction: reconciliationCase.recommendedAction || reconciliationCase.nextAction,
      blockingReason: reconciliationCase.blockingProductionReadiness
        ? 'critical_reconciliation_case'
        : reconciliationCase.lifecycleState,
      orderId: reconciliationCase.orderId || null,
      paymentIntentId: reconciliationCase.paymentIntentId || null,
      checkoutAttemptId: reconciliationCase.checkoutAttemptId || null,
      stripeState: reconciliationCase.lastObservedStripeState || reconciliationCase.stripeStatus || null,
      localState: reconciliationCase.lastObservedLocalState || null,
      timestamps: {
        createdAt: reconciliationCase.createdAt,
        updatedAt: reconciliationCase.updatedAt,
      },
    });
    const itemFromOrder = (order: Order, type: string, severity: 'high' | 'critical', recommendedAction: string, blockingReason: string) => ({
      type,
      severity,
      recommendedAction,
      blockingReason,
      orderId: order.id,
      paymentIntentId: order.paymentTransactionId || null,
      checkoutAttemptId: order.idempotencyKey || order.metadata?.checkoutAttemptId || null,
      stripeState: null,
      localState: `status:${order.status};paymentState:${order.paymentState || 'unknown'};fulfillmentState:${order.fulfillmentState || 'unknown'};reconciliationState:${order.reconciliationState || 'unknown'}`,
      timestamps: {
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
      },
    });
    const itemFromAttempt = (attempt: any) => ({
      type: 'stuck_checkout_attempt',
      severity: attempt.currentPhase === 'RECOVER_OR_RECONCILE' || attempt.state === 'reconciling' ? 'critical' : 'high',
      recommendedAction: attempt.nextAction || 'Retry the deterministic next checkout phase or route to reconciliation if ownership is stale.',
      blockingReason: attempt.waitingFor || attempt.state,
      orderId: attempt.orderId || null,
      paymentIntentId: attempt.paymentIntentId || null,
      checkoutAttemptId: attempt.idempotencyKey || attempt.id || null,
      stripeState: null,
      localState: `phase:${attempt.currentPhase || 'unknown'};authority:${attempt.authoritySource || 'unknown'};waitingFor:${attempt.waitingFor || 'unknown'};state:${attempt.state}`,
      timestamps: {
        createdAt: attempt.createdAt,
        updatedAt: attempt.updatedAt,
        lastTransitionAt: attempt.lastTransitionAt || null,
      },
    });

    return {
      openReconciliationCases: state.openReconciliationCases.map(itemFromCase),
      stuckCheckoutAttempts: state.stuckCheckoutAttempts.map(itemFromAttempt),
      stuckWebhookClaims: stuckWebhookClaims.map(claim => ({
        type: 'stuck_webhook_claim',
        severity: 'high',
        recommendedAction: 'Allow the claim lease to be reclaimed by replay, or inspect the failed worker before manual replay.',
        blockingReason: 'webhook_claim_expired',
        orderId: null,
        paymentIntentId: null,
        checkoutAttemptId: null,
        stripeState: `event:${claim.type || 'unknown'};status:${claim.status}`,
        localState: `claimExpiresAt:${claim.claimExpiresAt || 'unknown'}`,
        timestamps: {
          createdAt: claim.claimedAt || null,
          updatedAt: claim.updatedAt || null,
        },
      })),
      paidButUnfinalizedOrders: state.pendingPaidOrders.map(order => itemFromOrder(
        order,
        'paid_but_unfinalized_order',
        'critical',
        'Retry payment finalization or create a reconciliation case before fulfillment.',
        'payment_paid_order_pending'
      )),
      paidCancelledConflicts: [
        ...state.reconcilingPaidOrders.map(order => itemFromOrder(
          order,
          'paid_reconciling_order',
          'critical',
          'Resolve reconciliation before fulfillment, cancellation, or refund.',
          'paid_order_in_reconciliation'
        )),
        ...state.paidCancelledOrdersMissingReview.map(order => itemFromOrder(
          order,
          'paid_cancelled_conflict',
          'critical',
          'Move order to reconciliation and decide fulfillment versus refund from Stripe evidence.',
          'paid_order_cancelled_without_review'
        )),
      ],
      danglingPaymentIntents: state.openReconciliationCases.filter(c => c.reason === 'dangling_payment_intent').map(itemFromCase),
      refundRetryFailures: state.openReconciliationCases
        .filter(c => c.details?.refundAttemptId || c.details?.refundIdempotencyKey)
        .map(itemFromCase),
      raw: state,
    };
  }

  async getReconciliationCasesReadModel(options?: { limit?: number }): Promise<any> {
    return this.adminService.getReconciliationCasesReadModel(options);
  }

  async getForensicTimeline(attemptId: string): Promise<any> {
    return this.adminService.getForensicTimeline(attemptId);
  }

  async handleReconciliationOperatorAction(params: {
    caseId: string;
    action: 'mark_resolved' | 'retry_recovery' | 'initiate_refund_review' | 'acknowledge_external' | 'escalate';
    reason: string;
    actor: { id: string; email: string };
  }): Promise<void> {
    await this.adminService.handleReconciliationOperatorAction(params);

    if (params.action === 'retry_recovery') {
      const kase = await this.orderRepo.getReconciliationCase(params.caseId);
      if (kase && kase.reason === 'paid_not_finalized') {
        try {
          await this.checkoutFlow.confirmPaymentFromStripe(kase.paymentIntentId, null, params.actor.email);

          await this.adminService.handleReconciliationOperatorAction({
            caseId: params.caseId,
            action: 'mark_resolved',
            reason: `Automated recovery retry completed successfully: ${params.reason}`,
            actor: params.actor,
          });
        } catch (error: any) {
          logger.error('reconciliation_operator_action_retry_recovery_failed', { caseId: params.caseId, error });
          
          await this.orderRepo.createOrUpdateReconciliationCase({
            paymentIntentId: kase.paymentIntentId,
            reason: kase.reason,
            severity: kase.severity,
            lifecycleState: 'repair_attempted',
            repairAttempt: {
              attemptedAt: new Date().toISOString(),
              error: error.message,
            },
            evidence: [
              ...(kase.evidence || []),
              {
                type: 'recovery_failure',
                value: `Automated recovery attempt failed: ${error.message}`,
                recordedAt: new Date().toISOString()
              }
            ],
            operatorVisibleMessage: kase.operatorVisibleMessage,
            nextAction: 'Automated recovery failed. Manual intervention or escalation required.',
          });

          throw new Error(`Automated recovery failed: ${error.message}`);
        }
      }
    }
  }
}
