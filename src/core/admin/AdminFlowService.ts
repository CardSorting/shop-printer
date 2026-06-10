import * as crypto from 'node:crypto';
import type { UserRole, OrderStatus } from '@domain/models';
import { UnauthorizedError, OrderNotFoundError } from '@domain/errors';
import type { RefundApplicationService } from '../refund/refundApplicationService';
import type { InventoryApplicationService } from '../inventory/inventoryApplicationService';
import type { OrderService } from '../OrderService';
import type { OrderQueryService } from '../OrderQueryService';
import type { PurchaseOrderService } from '../PurchaseOrderService';
import type { AuthService } from '../AuthService';
import type { AdminApplicationService } from './adminApplicationService';
import type {
  AdjustInventoryInput,
  ArchiveProductInput,
  BatchArchiveProductsInput,
  BatchCreateProductsInput,
  BatchUpdateOrderStatusInput,
  BatchUpdateProductsInput,
  CancelPurchaseOrderInput,
  ClosePurchaseOrderAdminInput,
  CreateLocationInput,
  CreateProductInput,
  FulfillOrderInput,
  GetOrderInput,
  GetAdminOrderInput,
  AddOrderNoteInput,
  ApplyOrderDiscountInput,
  CreatePurchaseOrderAdminInput,
  ReleaseOrderHoldInput,
  SetOrderHoldInput,
  SwapOrderItemInput,
  UpdateOrderShippingAddressInput,
  UpgradeOrderShippingInput,
  ArchiveLocationInput,
  ListOrdersInput,
  ListUsersInput,
  ReceivePurchaseOrderInput,
  ReconcileOrderInput,
  ResolveReconciliationCaseInput,
  RequestRefundInput,
  SubmitPurchaseOrderInput,
  UpdateLocationInput,
  UpdateOrderStatusInput,
  UpdateProductInput,
  UpdateUserRoleInput,
} from './adminApplicationService';
import type { AdminActor } from './adminTypes';
import type { AdminOperatorEvent } from './adminTypes';
import { ProductAdminService } from './ProductAdminService';
import { LocationAdminService } from './LocationAdminService';
import {
  adminErr,
  adminFromCheckoutResult,
  adminFromError,
  adminFromInventoryResult,
  adminFromRefundResult,
  adminOk,
  adminTry,
} from './adminResult';
import type { IAdminOperatorEventLog } from './adminOperatorEventLog';
import { adminMutationKey } from './adminOperatorEventLog';
import type { ICommerceEventBus } from '../commerce/commerceEventBus';
import { mapAdminEventToEnvelope } from '../commerce/commerceEventMappers';

type AdminFlowDeps = {
  checkout: CheckoutApplicationService;
  inventory: InventoryApplicationService;
  orderService: OrderService;
  orderQueryService: OrderQueryService;
  purchaseOrderService: PurchaseOrderService;
  authService: AuthService;
  productAdmin: ProductAdminService;
  locationAdmin: LocationAdminService;
  refunds: RefundApplicationService;
  operatorEventLog: IAdminOperatorEventLog;
  commerceEventBus?: ICommerceEventBus;
};

const DESTRUCTIVE_ORDER_STATUSES = new Set<OrderStatus>(['cancelled']);

function validateReason(reason: string | undefined, label = 'reason') {
  if (!reason?.trim()) {
    return adminErr('VALIDATION_FAILED', `${label} is required for this admin mutation.`, false);
  }
  return null;
}

function toServiceActor(actor: AdminActor): { id: string; email: string } {
  return { id: actor.id, email: actor.email };
}

function requireElevated(actor: AdminActor) {
  if (!actor.elevated) {
    return adminErr(
      'ELEVATION_REQUIRED',
      'Fresh authorization required for this action. Please re-authenticate.',
      false,
    );
  }
  return null;
}

/**
 * Admin orchestration service. Implements AdminApplicationService for routes;
 * coordinates checkout, inventory, order, product, and operator event protocols.
 */
export class AdminFlowService implements AdminApplicationService {
  constructor(private deps: AdminFlowDeps) {}

  private get checkout() {
    return this.deps.checkout;
  }

  private get inventory() {
    return this.deps.inventory;
  }

  private get orderService() {
    return this.deps.orderService;
  }

  private get orderQueryService() {
    return this.deps.orderQueryService;
  }

  private get purchaseOrderService() {
    return this.deps.purchaseOrderService;
  }

  private get authService() {
    return this.deps.authService;
  }

  private get productAdmin() {
    return this.deps.productAdmin;
  }

  private get locationAdmin() {
    return this.deps.locationAdmin;
  }

  private get refunds() {
    return this.deps.refunds;
  }

  private get operatorEventLog() {
    return this.deps.operatorEventLog;
  }

  private get commerceEventBus() {
    return this.deps.commerceEventBus;
  }

  async listDashboard(input: { actor: AdminActor }) {
    return adminTry(async () => this.orderQueryService.getAdminDashboardSummary());
  }

  async listOrders(input: ListOrdersInput) {
    return adminTry(async () => {
      if (input.overview) {
        return this.orderService.getAdminOverview();
      }
      return this.orderService.getAllOrders({
        status: input.status,
        limit: input.limit,
        cursor: input.cursor,
      });
    });
  }

  async getOrder(input: GetOrderInput) {
    return adminTry(async () => {
      const order = await this.orderService.getOrder(input.orderId);
      if (!order) throw new OrderNotFoundError(input.orderId);
      return order;
    });
  }

  async getAdminOrder(input: GetAdminOrderInput) {
    return adminTry(async () => {
      const order = await this.orderService.getAdminOrder(input.orderId);
      if (!order) throw new OrderNotFoundError(input.orderId);
      return order;
    });
  }

  async getRecoveryReadModel(input: { actor: AdminActor; limit?: number }) {
    return adminTry(() => this.orderService.getRecoveryReadModel({ limit: input.limit }));
  }

  async exportOrdersToPirateShipCsv(input: {
    actor: AdminActor;
    orderIds: string[];
    packageDimensions?: { length: string; width: string; height: string };
    tareWeight?: number;
  }) {
    return adminTry(() => this.orderService.exportOrdersToPirateShipCsv(
      input.orderIds,
      input.packageDimensions,
      input.tareWeight,
    ));
  }

  async updateOrderStatus(input: UpdateOrderStatusInput) {
    if (DESTRUCTIVE_ORDER_STATUSES.has(input.status)) {
      const reasonError = validateReason(input.reason);
      if (reasonError) return reasonError;
      const elevationError = requireElevated(input.actor);
      if (elevationError) return elevationError;
    }
    if (input.status === 'refunded' || input.status === 'partially_refunded') {
      return adminErr(
        'VALIDATION_FAILED',
        'Refund status changes must be processed through the refund workflow.',
        false,
      );
    }

    const idempotencyKey = adminMutationKey(
      `order.status:${input.status}`,
      input.orderId,
      input.actor.id,
      input.idempotencyKey,
    );

    return this.runIdempotentMutation({
      actor: input.actor,
      action: `order.status.${input.status}`,
      targetType: 'order',
      targetId: input.orderId,
      reason: input.reason,
      idempotencyKey,
      duplicateData: { orderId: input.orderId, status: input.status },
      run: async () => {
        await this.orderService.updateOrderStatus(input.orderId, input.status, toServiceActor(input.actor));
        return { orderId: input.orderId, status: input.status };
      },
    });
  }

  async batchUpdateOrderStatus(input: BatchUpdateOrderStatusInput) {
    if (input.status === 'refunded' || input.status === 'partially_refunded') {
      return adminErr(
        'VALIDATION_FAILED',
        'Use the refund workflow for payment refunds; batch status updates cannot issue processor refunds.',
        false,
      );
    }
    if (DESTRUCTIVE_ORDER_STATUSES.has(input.status)) {
      const reasonError = validateReason(input.reason);
      if (reasonError) return reasonError;
      const elevationError = requireElevated(input.actor);
      if (elevationError) return elevationError;
    }
    if (!input.orderIds.length) {
      return adminErr('VALIDATION_FAILED', 'At least one order id is required.', false);
    }

    const idempotencyKey = adminMutationKey(
      `order.batch_status:${input.status}`,
      input.orderIds.join(','),
      input.actor.id,
      input.idempotencyKey,
    );

    return this.runIdempotentMutation({
      actor: input.actor,
      action: `order.batch_status.${input.status}`,
      targetType: 'order',
      targetId: input.orderIds.join(','),
      reason: input.reason,
      idempotencyKey,
      duplicateData: { updatedIds: input.orderIds },
      run: async () => {
        const result = await this.orderService.batchUpdateOrderStatus(
          input.orderIds,
          input.status,
          toServiceActor(input.actor),
        );
        return { updatedIds: result.updatedIds };
      },
    });
  }

  async fulfillOrder(input: FulfillOrderInput) {
    if (!input.trackingNumber?.trim() && !input.shippingCarrier?.trim()) {
      return adminErr('VALIDATION_FAILED', 'trackingNumber or shippingCarrier is required.', false);
    }

    const idempotencyKey = adminMutationKey(
      'order.fulfill',
      input.orderId,
      input.actor.id,
      input.idempotencyKey,
    );

    return this.runIdempotentMutation({
      actor: input.actor,
      action: 'order.fulfill',
      targetType: 'order',
      targetId: input.orderId,
      idempotencyKey,
      duplicateData: { orderId: input.orderId },
      after: {
        trackingNumber: input.trackingNumber,
        shippingCarrier: input.shippingCarrier,
      },
      run: async () => {
        await this.orderService.updateOrderFulfillment(
          input.orderId,
          { trackingNumber: input.trackingNumber, shippingCarrier: input.shippingCarrier },
          toServiceActor(input.actor),
        );
        return { orderId: input.orderId };
      },
    });
  }

  async reconcileOrder(input: ReconcileOrderInput) {
    const reasonError = validateReason(input.reason);
    if (reasonError) return reasonError;
    const evidenceError = validateReason(input.evidence, 'evidence');
    if (evidenceError) return evidenceError;
    const elevationError = requireElevated(input.actor);
    if (elevationError) return elevationError;

    const idempotencyKey = adminMutationKey(
      `order.reconcile:${input.resolutionAction}`,
      input.orderId,
      input.actor.id,
      input.idempotencyKey,
    );

    return this.runIdempotentMutation({
      actor: input.actor,
      action: `order.reconcile.${input.resolutionAction}`,
      targetType: 'order',
      targetId: input.orderId,
      reason: input.reason,
      idempotencyKey,
      duplicateData: { orderId: input.orderId, resolutionAction: input.resolutionAction },
      after: { evidence: input.evidence },
      run: async () => {
        await this.orderService.resolveReconciliation(
          input.orderId,
          input.resolutionAction,
          input.reason,
          input.evidence,
          toServiceActor(input.actor),
        );
        return { orderId: input.orderId, resolutionAction: input.resolutionAction };
      },
    });
  }

  async addOrderNote(input: AddOrderNoteInput) {
    const idempotencyKey = adminMutationKey(
      'order.note',
      input.orderId,
      input.actor.id,
      input.idempotencyKey,
    );

    return this.runIdempotentMutation({
      actor: input.actor,
      action: 'order.note',
      targetType: 'order',
      targetId: input.orderId,
      idempotencyKey,
      duplicateData: {
        id: idempotencyKey,
        authorId: input.actor.id,
        authorEmail: input.actor.email,
        text: input.text.trim(),
        createdAt: new Date(),
      },
      after: { text: input.text.trim() },
      run: () => this.orderService.addOrderNote(input.orderId, input.text, toServiceActor(input.actor)),
    });
  }

  async updateOrderShippingAddress(input: UpdateOrderShippingAddressInput) {
    const idempotencyKey = adminMutationKey(
      'order.shipping_address',
      input.orderId,
      input.actor.id,
      input.idempotencyKey,
    );

    return this.runIdempotentMutation({
      actor: input.actor,
      action: 'order.shipping_address',
      targetType: 'order',
      targetId: input.orderId,
      idempotencyKey,
      duplicateData: { orderId: input.orderId },
      run: async () => {
        await this.orderService.updateShippingAddress(input.orderId, input.address, toServiceActor(input.actor));
        return { orderId: input.orderId };
      },
    });
  }

  async applyOrderDiscount(input: ApplyOrderDiscountInput) {
    const idempotencyKey = adminMutationKey(
      'order.discount',
      input.orderId,
      input.actor.id,
      input.idempotencyKey ?? input.code,
    );

    return this.runIdempotentMutation({
      actor: input.actor,
      action: 'order.discount',
      targetType: 'order',
      targetId: input.orderId,
      idempotencyKey,
      duplicateData: { orderId: input.orderId, code: input.code },
      run: async () => {
        await this.orderService.applyDiscountToOrder(input.orderId, input.code, toServiceActor(input.actor));
        return { orderId: input.orderId, code: input.code };
      },
    });
  }

  async swapOrderItem(input: SwapOrderItemInput) {
    const idempotencyKey = adminMutationKey(
      'order.swap_item',
      input.orderId,
      input.actor.id,
      input.idempotencyKey ?? `${input.oldProductId}:${input.newProductId}`,
    );

    return this.runIdempotentMutation({
      actor: input.actor,
      action: 'order.swap_item',
      targetType: 'order',
      targetId: input.orderId,
      idempotencyKey,
      duplicateData: { orderId: input.orderId },
      run: async () => {
        await this.orderService.swapOrderItem(
          input.orderId,
          input.oldProductId,
          input.newProductId,
          toServiceActor(input.actor),
        );
        return { orderId: input.orderId };
      },
    });
  }

  async upgradeOrderShipping(input: UpgradeOrderShippingInput) {
    const idempotencyKey = adminMutationKey(
      'order.upgrade_shipping',
      input.orderId,
      input.actor.id,
      input.idempotencyKey ?? `${input.carrier}:${input.service}`,
    );

    return this.runIdempotentMutation({
      actor: input.actor,
      action: 'order.upgrade_shipping',
      targetType: 'order',
      targetId: input.orderId,
      idempotencyKey,
      duplicateData: { orderId: input.orderId },
      run: async () => {
        await this.orderService.upgradeShipping(
          input.orderId,
          input.carrier,
          input.service,
          toServiceActor(input.actor),
        );
        return { orderId: input.orderId };
      },
    });
  }

  async setOrderHold(input: SetOrderHoldInput) {
    const reasonError = validateReason(input.reason);
    if (reasonError) return reasonError;

    const idempotencyKey = adminMutationKey(
      'order.hold',
      input.orderId,
      input.actor.id,
      input.idempotencyKey,
    );

    return this.runIdempotentMutation({
      actor: input.actor,
      action: 'order.hold',
      targetType: 'order',
      targetId: input.orderId,
      reason: input.reason,
      idempotencyKey,
      duplicateData: { orderId: input.orderId },
      run: async () => {
        await this.orderService.setOrderHold(input.orderId, input.reason, toServiceActor(input.actor));
        return { orderId: input.orderId };
      },
    });
  }

  async releaseOrderHold(input: ReleaseOrderHoldInput) {
    const idempotencyKey = adminMutationKey(
      'order.release_hold',
      input.orderId,
      input.actor.id,
      input.idempotencyKey,
    );

    return this.runIdempotentMutation({
      actor: input.actor,
      action: 'order.release_hold',
      targetType: 'order',
      targetId: input.orderId,
      idempotencyKey,
      duplicateData: { orderId: input.orderId },
      run: async () => {
        await this.orderService.releaseOrderHold(input.orderId, toServiceActor(input.actor));
        return { orderId: input.orderId };
      },
    });
  }

  async createPurchaseOrder(input: CreatePurchaseOrderAdminInput) {
    const targetId = input.purchaseOrder.referenceNumber?.trim()
      || input.purchaseOrder.supplier.trim()
      || 'purchase-order';
    const idempotencyKey = adminMutationKey(
      'purchase_order.create',
      targetId,
      input.actor.id,
      input.idempotencyKey,
    );

    return this.runIdempotentMutation({
      actor: input.actor,
      action: 'purchase_order.create',
      targetType: 'purchase_order',
      targetId,
      idempotencyKey,
      duplicateData: { purchaseOrder: { id: targetId } as any },
      run: async () => {
        const purchaseOrder = await this.purchaseOrderService.createPurchaseOrder({
          ...input.purchaseOrder,
          adminUserId: input.actor.id,
          adminUserEmail: input.actor.email,
        });
        return { purchaseOrder };
      },
    });
  }

  async requestRefund(input: RequestRefundInput) {
    const reasonError = validateReason(input.reason);
    if (reasonError) return reasonError;
    const elevationError = requireElevated(input.actor);
    if (elevationError) return elevationError;
    if (!input.idempotencyKey?.trim()) {
      return adminErr('VALIDATION_FAILED', 'idempotencyKey is required for refund idempotency.', false);
    }

    const adminKey = adminMutationKey('order.refund', input.orderId, input.actor.id, input.idempotencyKey);
    const claim = await this.operatorEventLog.claimMutation(adminKey);
    if (claim === 'completed') {
      const status = await this.refunds.getRefundStatus({ orderId: input.orderId });
      if (!status.ok) return adminFromRefundResult(status);
      const match = status.data.stripeRefunds.find((entry) => entry.idempotencyKey.includes(input.idempotencyKey));
      if (match) {
        return adminOk({
          orderId: input.orderId,
          amount: match.amount,
          status: status.data.refundableBalance <= 0 ? 'refunded' : 'partially_refunded',
          stripeRefundId: match.id,
          idempotencyKey: input.idempotencyKey,
        }, true);
      }
    }

    const refundResult = await this.refunds.createRefund({
      orderId: input.orderId,
      amount: input.amount,
      idempotencyKey: input.idempotencyKey,
      reason: input.reason,
      actor: toServiceActor(input.actor),
      source: 'admin',
    });

    if (!refundResult.ok) {
      return adminFromRefundResult(refundResult);
    }

    await this.recordOperatorEvent({
      actor: input.actor,
      action: 'order.refund',
      targetType: 'order',
      targetId: input.orderId,
      reason: input.reason,
      after: {
        amount: refundResult.data.amount,
        status: refundResult.data.status,
        stripeRefundId: refundResult.data.stripeRefundId,
      },
      idempotencyKey: adminKey,
    });
    await this.operatorEventLog.markMutationCompleted(adminKey);

    return adminOk(refundResult.data, refundResult.duplicate);
  }

  async resolveReconciliationCase(input: ResolveReconciliationCaseInput) {
    const reasonError = validateReason(input.reason);
    if (reasonError) return reasonError;

    const idempotencyKey = adminMutationKey(
      `reconciliation:${input.action}`,
      input.caseId,
      input.actor.id,
      input.idempotencyKey,
    );

    const claim = await this.operatorEventLog.claimMutation(idempotencyKey);
    if (claim === 'completed') {
      return adminOk({ applied: true }, true);
    }

    const checkoutResult = await this.checkout.handleReconciliationOperatorAction({
      caseId: input.caseId,
      action: input.action,
      reason: input.reason,
      actor: toServiceActor(input.actor),
    });

    if (!checkoutResult.ok) {
      return adminFromCheckoutResult(checkoutResult);
    }

    await this.recordOperatorEvent({
      actor: input.actor,
      action: `reconciliation.${input.action}`,
      targetType: 'reconciliation_case',
      targetId: input.caseId,
      reason: input.reason,
      idempotencyKey,
    });
    await this.operatorEventLog.markMutationCompleted(idempotencyKey);

    return adminOk({ applied: true }, checkoutResult.duplicate);
  }

  async createProduct(input: CreateProductInput) {
    const idempotencyKey = adminMutationKey(
      'product.create',
      input.draft.handle ?? input.draft.name ?? 'new',
      input.actor.id,
      input.idempotencyKey,
    );

    const claim = await this.operatorEventLog.claimMutation(idempotencyKey);
    if (claim === 'completed') {
      return adminErr('DOMAIN_ERROR', 'Duplicate product create request; idempotency key already consumed.', false);
    }

    try {
      const product = await this.productAdmin.createProduct(input.draft, toServiceActor(input.actor));
      await this.recordOperatorEvent({
        actor: input.actor,
        action: 'product.create',
        targetType: 'product',
        targetId: product.id,
        after: { id: product.id, name: product.name, handle: product.handle },
        idempotencyKey,
      });
      await this.operatorEventLog.markMutationCompleted(idempotencyKey);
      return adminOk(product);
    } catch (error) {
      return adminFromError(error);
    }
  }

  async updateProduct(input: UpdateProductInput) {
    const idempotencyKey = adminMutationKey(
      'product.update',
      input.productId,
      input.actor.id,
      input.idempotencyKey,
    );

    const claim = await this.operatorEventLog.claimMutation(idempotencyKey);
    if (claim === 'completed') {
      return adminErr('DOMAIN_ERROR', 'Duplicate product update request; idempotency key already consumed.', false);
    }

    try {
      const product = await this.productAdmin.updateProduct(
        input.productId,
        input.patch,
        toServiceActor(input.actor),
      );
      await this.recordOperatorEvent({
        actor: input.actor,
        action: 'product.update',
        targetType: 'product',
        targetId: input.productId,
        after: input.patch,
        idempotencyKey,
      });
      await this.operatorEventLog.markMutationCompleted(idempotencyKey);
      return adminOk(product);
    } catch (error) {
      return adminFromError(error);
    }
  }

  async archiveProduct(input: ArchiveProductInput) {
    const reasonError = validateReason(input.reason);
    if (reasonError) return reasonError;

    const idempotencyKey = adminMutationKey(
      'product.archive',
      input.productId,
      input.actor.id,
      input.idempotencyKey,
    );

    const claim = await this.operatorEventLog.claimMutation(idempotencyKey);
    if (claim === 'completed') {
      return adminOk({ archived: true, productId: input.productId }, true);
    }

    try {
      await this.productAdmin.archiveProduct(input.productId, toServiceActor(input.actor));
      await this.recordOperatorEvent({
        actor: input.actor,
        action: 'product.archive',
        targetType: 'product',
        targetId: input.productId,
        reason: input.reason,
        idempotencyKey,
      });
      await this.operatorEventLog.markMutationCompleted(idempotencyKey);
      return adminOk({ archived: true, productId: input.productId });
    } catch (error) {
      return adminFromError(error);
    }
  }

  async adjustInventory(input: AdjustInventoryInput) {
    if (!input.updates.length) {
      return adminErr('VALIDATION_FAILED', 'Inventory updates must not be empty.', false);
    }

    const claim = await this.operatorEventLog.claimMutation(input.idempotencyKey);
    if (claim === 'completed') {
      return adminOk({ updatedCount: input.updates.length }, true);
    }

    const inventoryResult = await this.inventory.adjustInventory({
      updates: input.updates,
      idempotencyKey: input.idempotencyKey,
      actor: 'admin',
      actorUserId: input.actor.id,
      actorEmail: input.actor.email,
      note: input.note,
    });

    if (!inventoryResult.ok) {
      return adminFromInventoryResult(inventoryResult);
    }

    await this.recordOperatorEvent({
      actor: input.actor,
      action: 'inventory.adjust',
      targetType: 'inventory',
      targetId: input.updates.map((u) => u.productId).join(','),
      reason: input.reason,
      after: { updates: input.updates },
      idempotencyKey: input.idempotencyKey,
    });
    await this.operatorEventLog.markMutationCompleted(input.idempotencyKey);

    return adminOk(
      { updatedCount: input.updates.length },
      inventoryResult.duplicate,
    );
  }

  async receivePurchaseOrder(input: ReceivePurchaseOrderInput) {
    const poId = input.receive.purchaseOrderId;
    const idempotencyKey = adminMutationKey(
      'purchase_order.receive',
      poId,
      input.actor.id,
      input.idempotencyKey ?? input.receive.idempotencyKey,
    );

    const claim = await this.operatorEventLog.claimMutation(idempotencyKey);
    if (claim === 'completed') {
      return adminOk({
        purchaseOrderId: poId,
        sessionId: idempotencyKey,
        inventoryUpdateCount: 0,
      }, true);
    }

    try {
      const receiveInput = { ...input.receive, idempotencyKey };
      const result = await this.purchaseOrderService.receiveItems(receiveInput, toServiceActor(input.actor));
      await this.recordOperatorEvent({
        actor: input.actor,
        action: 'purchase_order.receive',
        targetType: 'purchase_order',
        targetId: poId,
        after: { sessionId: result.session.id, itemCount: input.receive.items.length },
        idempotencyKey,
      });
      await this.operatorEventLog.markMutationCompleted(idempotencyKey);
      return adminOk({
        purchaseOrderId: poId,
        sessionId: result.session.id,
        inventoryUpdateCount: result.inventoryUpdates.length,
      });
    } catch (error) {
      return adminFromError(error);
    }
  }

  async submitPurchaseOrder(input: SubmitPurchaseOrderInput) {
    const idempotencyKey = adminMutationKey(
      'purchase_order.submit',
      input.purchaseOrderId,
      input.actor.id,
      input.idempotencyKey,
    );

    return this.runIdempotentMutation({
      actor: input.actor,
      action: 'purchase_order.submit',
      targetType: 'purchase_order',
      targetId: input.purchaseOrderId,
      idempotencyKey,
      duplicateData: { purchaseOrder: { id: input.purchaseOrderId } as any },
      run: async () => {
        const purchaseOrder = await this.purchaseOrderService.submitOrder(
          input.purchaseOrderId,
          input.actor.id,
          input.actor.email,
        );
        return { purchaseOrder };
      },
    });
  }

  async cancelPurchaseOrder(input: CancelPurchaseOrderInput) {
    const reasonError = validateReason(input.reason);
    if (reasonError) return reasonError;

    const idempotencyKey = adminMutationKey(
      'purchase_order.cancel',
      input.purchaseOrderId,
      input.actor.id,
      input.idempotencyKey,
    );

    return this.runIdempotentMutation({
      actor: input.actor,
      action: 'purchase_order.cancel',
      targetType: 'purchase_order',
      targetId: input.purchaseOrderId,
      reason: input.reason,
      idempotencyKey,
      duplicateData: { purchaseOrder: { id: input.purchaseOrderId } as any },
      run: async () => {
        const purchaseOrder = await this.purchaseOrderService.cancelOrder(
          input.purchaseOrderId,
          input.actor.id,
          input.actor.email,
        );
        return { purchaseOrder };
      },
    });
  }

  async closePurchaseOrder(input: ClosePurchaseOrderAdminInput) {
    const idempotencyKey = adminMutationKey(
      'purchase_order.close',
      input.close.id,
      input.actor.id,
      input.idempotencyKey,
    );

    return this.runIdempotentMutation({
      actor: input.actor,
      action: 'purchase_order.close',
      targetType: 'purchase_order',
      targetId: input.close.id,
      reason: input.close.notes,
      idempotencyKey,
      duplicateData: { purchaseOrder: { id: input.close.id } as any },
      run: async () => {
        const purchaseOrder = await this.purchaseOrderService.closeOrder(
          input.close,
          input.actor.id,
          input.actor.email,
        );
        return { purchaseOrder };
      },
    });
  }

  async batchUpdateProducts(input: BatchUpdateProductsInput) {
    if (!input.updates.length) {
      return adminErr('VALIDATION_FAILED', 'Product updates must not be empty.', false);
    }

    const idempotencyKey = adminMutationKey(
      'product.batch_update',
      input.updates.map((u) => u.id).join(','),
      input.actor.id,
      input.idempotencyKey,
    );

    return this.runIdempotentMutation({
      actor: input.actor,
      action: 'product.batch_update',
      targetType: 'product',
      targetId: input.updates.map((u) => u.id).join(','),
      idempotencyKey,
      duplicateData: [],
      after: { count: input.updates.length },
      run: () => this.productAdmin.batchUpdateProducts(input.updates, toServiceActor(input.actor)),
    });
  }

  async batchArchiveProducts(input: BatchArchiveProductsInput) {
    const reasonError = validateReason(input.reason);
    if (reasonError) return reasonError;
    if (!input.productIds.length) {
      return adminErr('VALIDATION_FAILED', 'Product ids must not be empty.', false);
    }

    const idempotencyKey = adminMutationKey(
      'product.batch_archive',
      input.productIds.join(','),
      input.actor.id,
      input.idempotencyKey,
    );

    return this.runIdempotentMutation({
      actor: input.actor,
      action: 'product.batch_archive',
      targetType: 'product',
      targetId: input.productIds.join(','),
      reason: input.reason,
      idempotencyKey,
      duplicateData: { archivedCount: input.productIds.length },
      run: async () => {
        await this.productAdmin.batchArchiveProducts(input.productIds, toServiceActor(input.actor));
        return { archivedCount: input.productIds.length };
      },
    });
  }

  async batchCreateProducts(input: BatchCreateProductsInput) {
    if (!input.drafts.length) {
      return adminErr('VALIDATION_FAILED', 'Product drafts must not be empty.', false);
    }

    const idempotencyKey = adminMutationKey(
      'product.batch_create',
      String(input.drafts.length),
      input.actor.id,
      input.idempotencyKey,
    );

    return this.runIdempotentMutation({
      actor: input.actor,
      action: 'product.batch_create',
      targetType: 'product',
      targetId: 'batch',
      idempotencyKey,
      duplicateData: [],
      after: { count: input.drafts.length },
      run: () => this.productAdmin.batchCreateProducts(input.drafts, toServiceActor(input.actor)),
    });
  }

  async listLocations(_input: { actor: AdminActor }) {
    return adminTry(() => this.locationAdmin.listLocations());
  }

  async getLocation(input: { actor: AdminActor; locationId: string }) {
    const location = await this.locationAdmin.getLocation(input.locationId);
    if (!location) {
      return adminErr('NOT_FOUND', 'Location not found.', false);
    }
    return adminOk(location);
  }

  async createLocation(input: CreateLocationInput) {
    const idempotencyKey = adminMutationKey(
      'location.create',
      input.location.id ?? input.location.name,
      input.actor.id,
      input.idempotencyKey,
    );

    return this.runIdempotentMutation({
      actor: input.actor,
      action: 'location.create',
      targetType: 'inventory',
      targetId: input.location.id ?? input.location.name,
      idempotencyKey,
      duplicateData: input.location,
      after: { name: input.location.name, type: input.location.type },
      run: () => this.locationAdmin.createLocation(input.location),
    });
  }

  async updateLocation(input: UpdateLocationInput) {
    const idempotencyKey = adminMutationKey(
      'location.update',
      input.locationId,
      input.actor.id,
      input.idempotencyKey,
    );

    return this.runIdempotentMutation({
      actor: input.actor,
      action: 'location.update',
      targetType: 'inventory',
      targetId: input.locationId,
      idempotencyKey,
      duplicateData: { id: input.locationId, ...input.patch } as any,
      after: input.patch,
      run: () => this.locationAdmin.updateLocation(input.locationId, input.patch),
    });
  }

  async archiveLocation(input: ArchiveLocationInput) {
    const reasonError = validateReason(input.reason);
    if (reasonError) return reasonError;

    const idempotencyKey = adminMutationKey(
      'location.archive',
      input.locationId,
      input.actor.id,
      input.idempotencyKey,
    );

    return this.runIdempotentMutation({
      actor: input.actor,
      action: 'location.archive',
      targetType: 'inventory',
      targetId: input.locationId,
      reason: input.reason,
      idempotencyKey,
      duplicateData: { locationId: input.locationId, archived: true as const },
      run: async () => {
        await this.locationAdmin.archiveLocation(input.locationId);
        return { locationId: input.locationId, archived: true as const };
      },
    });
  }

  async listUsers(input: ListUsersInput) {
    return adminTry(async () => {
      const users = await this.authService.getAllUsers();
      return this.deps.orderQueryService.getCustomerSummaries(users);
    });
  }

  async updateUserRole(input: UpdateUserRoleInput) {
    const reasonError = validateReason(input.reason);
    if (reasonError) return reasonError;

    if (!input.actor.elevated) {
      return adminErr(
        'ELEVATION_REQUIRED',
        'Fresh authorization required for role changes. Please re-authenticate.',
        false,
      );
    }

    const idempotencyKey = adminMutationKey(
      'user.role',
      input.userId,
      input.actor.id,
      input.idempotencyKey,
    );

    const claim = await this.operatorEventLog.claimMutation(idempotencyKey);
    if (claim === 'completed') {
      const users = await this.authService.getAllUsers();
      const existing = users.find((u) => u.id === input.userId);
      if (!existing) {
        return adminErr('NOT_FOUND', `User ${input.userId} not found.`, false);
      }
      return adminOk({ ...existing, role: input.role }, true);
    }

    try {
      const updated = await this.authService.updateUser(
        input.userId,
        { role: input.role },
        toServiceActor(input.actor),
      );
      await this.recordOperatorEvent({
        actor: input.actor,
        action: 'user.role_update',
        targetType: 'user',
        targetId: input.userId,
        reason: input.reason,
        after: { role: input.role },
        idempotencyKey,
      });
      await this.operatorEventLog.markMutationCompleted(idempotencyKey);
      return adminOk(updated);
    } catch (error) {
      if (error instanceof UnauthorizedError) {
        return adminErr('FORBIDDEN', error.message, false);
      }
      return adminFromError(error);
    }
  }

  private async runIdempotentMutation<T>(params: {
    actor: AdminActor;
    action: string;
    targetType: AdminOperatorEvent['targetType'];
    targetId: string;
    idempotencyKey: string;
    reason?: string;
    before?: unknown;
    after?: unknown;
    duplicateData: T;
    run: () => Promise<T>;
  }) {
    const claim = await this.operatorEventLog.claimMutation(params.idempotencyKey);
    if (claim === 'completed') {
      return adminOk(params.duplicateData, true);
    }

    try {
      const data = await params.run();
      await this.recordOperatorEvent({
        actor: params.actor,
        action: params.action,
        targetType: params.targetType,
        targetId: params.targetId,
        reason: params.reason,
        before: params.before,
        after: params.after ?? data,
        idempotencyKey: params.idempotencyKey,
      });
      await this.operatorEventLog.markMutationCompleted(params.idempotencyKey);
      return adminOk(data);
    } catch (error) {
      return adminFromError(error);
    }
  }

  private async recordOperatorEvent(params: {
    actor: AdminActor;
    action: string;
    targetType: AdminOperatorEvent['targetType'];
    targetId: string;
    reason?: string;
    before?: unknown;
    after?: unknown;
    idempotencyKey: string;
  }): Promise<void> {
    const event: AdminOperatorEvent = {
      id: crypto.randomUUID(),
      actorId: params.actor.id,
      actorRole: params.actor.role,
      action: params.action,
      targetType: params.targetType,
      targetId: params.targetId,
      reason: params.reason,
      before: params.before,
      after: params.after,
      idempotencyKey: params.idempotencyKey,
      createdAt: new Date().toISOString(),
    };
    await this.operatorEventLog.recordEvent(event);
    if (this.commerceEventBus) {
      await this.commerceEventBus.publish(mapAdminEventToEnvelope(event));
    }
  }
}

export type { AdminFlowDeps };
