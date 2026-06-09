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
import { OrderFulfillmentWorkflowService } from './order/OrderFulfillmentWorkflowService';
import { OrderLogisticsService } from './order/OrderLogisticsService';
import { OrderReadService } from './order/OrderReadService';
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
  private readonly logisticsService: OrderLogisticsService;
  private readonly fulfillmentWorkflowService: OrderFulfillmentWorkflowService;
  private readonly readService: OrderReadService;
  private readonly adminService: OrderAdminService;

  constructor(
    private orderRepo: IOrderRepository,
    productRepo: IProductRepository,
    discountRepo: IDiscountRepository,
    audit: AuditService,
    shippingRepo?: IShippingRepository,
    private readonly stripeService?: StripeService,
  ) {
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

  cancelExpiredPendingOrder(orderId: string): Promise<void> {
    return this.adminService.updateOrderStatus(orderId, 'cancelled', {
      id: 'system',
      email: 'system@woodbine.com',
    });
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
      stuckWebhookClaims = await this.stripeService?.listStuckWebhookClaims(limit) ?? [];
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

  handleReconciliationOperatorAction(params: {
    caseId: string;
    action: 'mark_resolved' | 'retry_recovery' | 'initiate_refund_review' | 'acknowledge_external' | 'escalate';
    reason: string;
    actor: { id: string; email: string };
  }): Promise<void> {
    return this.adminService.handleReconciliationOperatorAction(params);
  }
}
