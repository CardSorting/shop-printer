import * as crypto from 'node:crypto';
import type { IDiscountRepository, IOrderRepository, IProductRepository } from '@domain/repositories';
import type { Address, Order, OrderFulfillmentEvent, OrderNote, OrderStatus, PaymentReconciliationCase } from '@domain/models';
import { OrderNotFoundError, ProductNotFoundError } from '@domain/errors';
import { assertValidOrderStatusTransition, calculateTax, coalesceStockUpdates, deriveTrackingUrl } from '@domain/rules';
import { doc, getUnifiedDb, runTransaction, serverTimestamp } from '@infrastructure/firebase/bridge';
import { AuditService } from '../AuditService';
import { DiscountService } from '../DiscountService';
import { logger } from '@utils/logger';
import type { OrderActor } from './types';

export class OrderAdminService {
  constructor(
    private orderRepo: IOrderRepository,
    private productRepo: IProductRepository,
    private discountRepo: IDiscountRepository,
    private audit: AuditService
  ) {}

  private isPaidPaymentState(order: Order): boolean {
    return order.paymentState === 'paid' || order.paymentState === 'partially_refunded' || order.paymentState === 'refunded';
  }

  private fulfillmentTransitionForStatus(status: OrderStatus): {
    nextState: 'processing' | 'shipped' | 'delivered' | 'ready_for_pickup' | 'delivery_started';
    allowed: Array<'unfulfilled' | 'processing' | 'ready_for_pickup' | 'delivery_started' | 'shipped' | 'delivered'>;
  } | null {
    if (status === 'processing') return { nextState: 'processing', allowed: ['unfulfilled', 'processing'] };
    if (status === 'shipped') return { nextState: 'shipped', allowed: ['unfulfilled', 'processing', 'shipped'] };
    if (status === 'delivered') return { nextState: 'delivered', allowed: ['ready_for_pickup', 'delivery_started', 'shipped', 'delivered'] };
    if (status === 'ready_for_pickup') return { nextState: 'ready_for_pickup', allowed: ['unfulfilled', 'processing', 'ready_for_pickup'] };
    if (status === 'delivery_started') return { nextState: 'delivery_started', allowed: ['unfulfilled', 'processing', 'delivery_started'] };
    return null;
  }

  private inferCarrierFromTracking(trackingNumber: string): string {
    const tn = trackingNumber.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (/^\d{12}$|^\d{15}$/.test(tn)) return 'FedEx';
    if (/^1Z[A-Z0-9]{16}$/.test(tn)) return 'UPS';
    if (/^\d{20,22}$|^[A-Z]{2}\d{9}[A-Z]{2}$/.test(tn)) return 'USPS';
    if (/^\d{10}$/.test(tn)) return 'DHL';
    return 'Other';
  }

  private async movePaidCancellationToReconciliation(order: Order, reason: string, transaction?: any): Promise<void> {
    await this.orderRepo.transitionReconciliationState(order.id, ['none', 'needs_review'], 'needs_review', reason, transaction);
    await this.orderRepo.guardedUpdateStatus(order.id, [order.status], 'reconciling', reason, transaction);
    if (order.paymentTransactionId) {
      await this.orderRepo.createOrUpdateReconciliationCase({
        paymentIntentId: order.paymentTransactionId,
        orderId: order.id,
        checkoutAttemptId: order.idempotencyKey || order.metadata?.checkoutAttemptId || null,
        reason: 'paid_cancelled',
        severity: 'critical',
        stripeStatus: null,
        operatorVisibleMessage: `Cancellation was requested for paid order ${order.id}.`,
        nextAction: 'Review Stripe payment and choose an explicit refund or fulfillment resolution.',
        details: {
          requestedAction: 'cancelled',
          previousStatus: order.status,
          paymentState: order.paymentState,
        },
      }, transaction);
    }
    await this.orderRepo.markForReconciliation(order.id, [
      `Cancellation requested for paid order ${order.id}.`,
      'Automatic cancellation was blocked; manual refund or fulfillment decision is required.',
    ], false, transaction);
  }

  async resolveReconciliation(
    id: string,
    resolutionAction: OrderStatus,
    reason: string,
    evidence: string,
    actor: OrderActor
  ): Promise<void> {
    const order = await this.orderRepo.getById(id);
    if (!order) throw new OrderNotFoundError(id);
    if (!order.reconciliationRequired) throw new Error('Order is not in a reconciliation state.');
    if (!reason?.trim()) throw new Error('A resolution reason is required.');
    if (!evidence?.trim()) throw new Error('Supporting evidence is required.');

    await runTransaction(getUnifiedDb(), async (transaction: any) => {
      await this.orderRepo.transitionReconciliationState(id, ['needs_review', 'in_progress'], 'resolved', 'manual_reconciliation_resolution', transaction);
      if (resolutionAction === 'refunded' || resolutionAction === 'partially_refunded') {
        await this.orderRepo.transitionPaymentState(id, ['paid', 'partially_refunded'], resolutionAction === 'refunded' ? 'refunded' : 'partially_refunded', 'manual_reconciliation_resolution', transaction);
      }
      await this.orderRepo.guardedUpdateStatus(id, [order.status], resolutionAction, 'manual_reconciliation_resolution', transaction);
      await this.orderRepo.clearReconciliationFlag(id, transaction);
      await this.orderRepo.updateMetadata(id, {
        ...order.metadata,
        reconciliationResolvedAt: new Date().toISOString(),
        reconciliationResolvedBy: actor.id
      }, transaction);
    });

    const resolutionNote = `RECONCILIATION RESOLVED: Action=${resolutionAction}, Reason=${reason}, Evidence=${evidence}, By=${actor.email}`;
    await this.orderRepo.markForReconciliation(id, [resolutionNote], true);

    await this.audit.record({
      userId: actor.id,
      userEmail: actor.email,
      action: 'order_status_changed',
      targetId: id,
      details: { resolution: true, action: resolutionAction, reason, evidence }
    });
  }

  async updateOrderStatus(id: string, status: OrderStatus, actor: OrderActor): Promise<void> {
    const order = await this.orderRepo.getById(id);
    if (!order) throw new OrderNotFoundError(id);
    if (order.reconciliationRequired) {
      throw new Error('Order requires manual reconciliation and is locked for mutations.');
    }

    assertValidOrderStatusTransition(order.status, status);
    if (status === 'refunded' || status === 'partially_refunded') {
      throw new Error('Refund status changes must be processed through the refund workflow.');
    }
    if (status === 'cancelled') {
      if (this.isPaidPaymentState(order)) {
        await this.movePaidCancellationToReconciliation(order, 'admin_paid_order_cancellation_blocked');
        throw new Error('Cannot automatically cancel a paid order. Order moved to reconciliation.');
      }
      await this.releaseInventoryReservation(order);
      await this.orderRepo.transitionPaymentState(id, ['unpaid', 'requires_payment_method', 'processing', 'failed'], 'cancelled', 'admin_order_cancelled');
      await this.orderRepo.transitionFulfillmentState(id, ['unfulfilled', 'processing', 'ready_for_pickup', 'delivery_started'], 'cancelled', 'admin_order_cancelled');
    }
    const fulfillmentTransition = this.fulfillmentTransitionForStatus(status);
    if (fulfillmentTransition) {
      await this.orderRepo.transitionFulfillmentState(id, fulfillmentTransition.allowed, fulfillmentTransition.nextState, 'admin_order_status_update');
    }
    await this.orderRepo.guardedUpdateStatus(id, [order.status], status, 'admin_order_status_update');

    if (status === 'cancelled' && order.discountCode) {
      const discount = await this.discountRepo.getByCode(order.discountCode);
      if (discount) {
        await runTransaction(getUnifiedDb(), async (transaction: any) => {
          await this.discountRepo.decrementUsage(discount.id, transaction);
          if (order.userId) {
            await this.orderRepo.removeUserDiscountUsage(order.userId, order.discountCode!, transaction);
          }
        }).catch(error => {
          logger.error('Failed to rollback discount usage during order cancellation', { orderId: id, error });
        });
      }
    }

    await this.audit.record({
      userId: actor.id,
      userEmail: actor.email,
      action: 'order_status_changed',
      targetId: id,
      details: { from: order.status, to: status }
    });
  }

  async batchUpdateOrderStatus(ids: string[], status: OrderStatus, actor: OrderActor): Promise<{ updatedIds: string[] }> {
    if (!ids.length) return { updatedIds: [] };
    if (status === 'refunded' || status === 'partially_refunded') {
      throw new Error('Refund status changes must be processed through the refund workflow.');
    }

    const updatedIds = await runTransaction(getUnifiedDb(), async (transaction: any) => {
      const validIds: string[] = [];
      
      for (const id of ids) {
        const order = await this.orderRepo.getById(id, transaction);
        if (!order) {
          logger.warn(`[batchUpdateOrderStatus] Order ${id} not found, skipping.`);
          continue;
        }
        
        // Point 7: Reconciliation Abuse Block
        if (order.reconciliationRequired) {
          logger.warn(`[batchUpdateOrderStatus] Order ${id} is locked for reconciliation, skipping.`);
          continue;
        }

        // Production Hardening: Verify status transition safety WITHIN the transaction
        try {
          assertValidOrderStatusTransition(order.status, status);
          if (status === 'cancelled' && this.isPaidPaymentState(order)) {
            await this.movePaidCancellationToReconciliation(order, 'admin_batch_paid_order_cancellation_blocked', transaction);
            logger.warn(`[batchUpdateOrderStatus] Paid order ${id} moved to reconciliation instead of cancellation.`);
            continue;
          }

          if (status === 'cancelled') {
            await this.orderRepo.transitionPaymentState(id, ['unpaid', 'requires_payment_method', 'processing', 'failed'], 'cancelled', 'admin_batch_order_cancelled', transaction);
            await this.orderRepo.transitionFulfillmentState(id, ['unfulfilled', 'processing', 'ready_for_pickup', 'delivery_started'], 'cancelled', 'admin_batch_order_cancelled', transaction);
          }

          const fulfillmentTransition = this.fulfillmentTransitionForStatus(status);
          if (fulfillmentTransition) {
            await this.orderRepo.transitionFulfillmentState(id, fulfillmentTransition.allowed, fulfillmentTransition.nextState, 'admin_batch_order_status_update', transaction);
          }
          
          await this.orderRepo.guardedUpdateStatus(id, [order.status], status, 'admin_batch_order_status_update', transaction);
          validIds.push(id);
          
          // Points 1 & 7: Audit each individual status change within the same transaction substrate
          // Note: We record a single batch audit event below for high-level visibility, 
          // but the state change is now transactionally sound for each order.
        } catch (e) {
          logger.warn(`[batchUpdateOrderStatus] Invalid transition for order ${id}: ${order.status} -> ${status}. Skipping.`);
        }
      }

      if (validIds.length > 0) {
        await this.audit.recordWithTransaction(transaction, {
          userId: actor.id,
          userEmail: actor.email,
          action: 'order_status_changed',
          targetId: 'batch',
          details: { ids: validIds, to: status, count: validIds.length }
        });
      }

      return validIds;
    });

    return { updatedIds };
  }

  async cleanupExpiredOrders(expirationMinutes = 60): Promise<{ count: number }> {
    const cutoff = new Date();
    cutoff.setMinutes(cutoff.getMinutes() - expirationMinutes);
    const { orders } = await this.orderRepo.getAll({ status: 'pending', to: cutoff });
    logger.info(`[OrderService] Cleaning up ${orders.length} expired pending orders (cutoff: ${expirationMinutes}m)`);

    for (const order of orders) {
      await this.updateOrderStatus(order.id, 'cancelled', {
        id: 'system',
        email: 'system@dreambees.art'
      });
      await this.audit.record({
        userId: 'system',
        userEmail: 'system@dreambees.art',
        action: 'order_status_changed',
        targetId: order.id,
        details: { from: 'pending', to: 'cancelled', reason: 'expired', expirationMinutes }
      });
    }

    return { count: orders.length };
  }

  async applyDiscountToOrder(orderId: string, code: string, actor: OrderActor): Promise<void> {
    const order = await this.orderRepo.getById(orderId);
    if (!order) throw new OrderNotFoundError(orderId);
    if (order.discountCode) throw new Error('Order already has a discount applied.');
    if (order.status !== 'confirmed' && order.status !== 'processing' && order.status !== 'pending') {
      throw new Error(`Cannot apply discount to order in status: ${order.status}`);
    }

    const discountService = new DiscountService(this.discountRepo, this.audit, this.orderRepo);
    const lineItems = await Promise.all(order.items.map(async (item) => {
      const product = await this.productRepo.getById(item.productId);
      return {
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        collections: product?.collections ?? [],
      };
    }));
    const validation = await discountService.validateDiscount(code, order.total + (order.discountAmount || 0), order.userId, undefined, [], { lineItems });
    if (!validation.valid || !validation.discount) {
      throw new Error(`Invalid discount: ${validation.message}`);
    }

    const discountAmount = validation.discountAmount || 0;
    const newTotal = Math.max(0, order.total - discountAmount);

    await runTransaction(getUnifiedDb(), async (transaction: any) => {
      await this.orderRepo.updateMetadata(orderId, {
        ...(order.metadata || {}),
        manualDiscountAppliedAt: new Date().toISOString(),
        manualDiscountAppliedBy: actor.email,
        originalTotal: order.total
      }, transaction);

      const newTaxAmount = calculateTax({
        subtotal: order.total + (order.discountAmount || 0) - discountAmount,
        shipping: order.shippingAmount,
        discount: 0, // Discount already subtracted from subtotal for calculateTax
        address: order.shippingAddress
      });
      const finalTotal = Math.max(0, (order.total + (order.discountAmount || 0)) + order.shippingAmount + newTaxAmount - ((order.discountAmount || 0) + discountAmount));

      await transaction.update(doc(getUnifiedDb(), 'orders', orderId), {
        discountCode: code,
        discountAmount: (order.discountAmount || 0) + discountAmount,
        taxAmount: newTaxAmount,
        total: finalTotal,
        updatedAt: serverTimestamp()
      });

      await this.discountRepo.incrementUsage(validation.discount!.id, transaction);
    });

    await this.audit.record({
      userId: actor.id,
      userEmail: actor.email,
      action: 'order_status_changed',
      targetId: orderId,
      details: { action: 'manual_discount', code, amount: discountAmount }
    });
  }

  async updateShippingAddress(orderId: string, address: Address, actor: OrderActor): Promise<void> {
    const order = await this.orderRepo.getById(orderId);
    if (!order) throw new OrderNotFoundError(orderId);
    if (order.status === 'shipped' || order.status === 'delivered') {
      throw new Error('Cannot update address for an order that has already shipped.');
    }

    await runTransaction(getUnifiedDb(), async (transaction: any) => {
      await transaction.update(doc(getUnifiedDb(), 'orders', orderId), {
        shippingAddress: address,
        updatedAt: serverTimestamp()
      });

      if (this.orderRepo.addNote) {
        await this.orderRepo.addNote(orderId, {
          id: crypto.randomUUID(),
          authorId: actor.id,
          authorEmail: actor.email,
          text: `Shipping address updated by support to: ${address.street}, ${address.city}, ${address.state} ${address.zip}, ${address.country}`,
          createdAt: new Date()
        }, transaction);
      }
    });

    await this.audit.record({
      userId: actor.id,
      userEmail: actor.email,
      action: 'order_status_changed',
      targetId: orderId,
      details: { action: 'address_update', newAddress: address }
    });
  }

  async swapOrderItem(orderId: string, oldProductId: string, newProductId: string, actor: OrderActor): Promise<void> {
    const changed = await runTransaction(getUnifiedDb(), async (transaction: any) => {
      const order = await this.orderRepo.getById(orderId, transaction);
      if (!order) throw new OrderNotFoundError(orderId);

      // PRODUCTION HARDENING: Lock items once fulfillment has started or order is under investigation
      if (['shipped', 'delivered', 'reconciling'].includes(order.status)) {
        throw new Error(`Cannot swap items in order with status: ${order.status}`);
      }

      const oldItem = order.items.find(item => item.productId === oldProductId);
      const alreadySwapped = order.items.find(item => item.productId === newProductId);
      if (!oldItem && alreadySwapped) return false;
      if (!oldItem) throw new Error('Item not found in order');

      const newProduct = await this.productRepo.getById(newProductId, transaction);
      if (!newProduct) throw new ProductNotFoundError(newProductId);
      if (!newProduct.isDigital && newProduct.stock < oldItem.quantity) {
        throw new Error('New product does not have sufficient stock.');
      }

      const stockUpdates = [];
      if (!oldItem.isDigital) {
        stockUpdates.push({ id: oldProductId, variantId: oldItem.variantId, delta: oldItem.quantity });
      }
      if (!newProduct.isDigital) {
        stockUpdates.push({ id: newProductId, delta: -oldItem.quantity });
      }
      if (stockUpdates.length > 0) {
        await this.productRepo.batchUpdateStock(stockUpdates, transaction);
      }

      const newItems = order.items.map(item => {
        if (item.productId !== oldProductId) return item;
        return {
          ...item,
          productId: newProductId,
          variantId: undefined,
          variantTitle: undefined,
          name: newProduct.name,
          imageUrl: newProduct.imageUrl,
          unitPrice: newProduct.price,
          productHandle: newProduct.handle,
          isDigital: newProduct.isDigital,
          digitalAssets: newProduct.isDigital ? newProduct.digitalAssets : undefined,
          shippingClassId: newProduct.shippingClassId,
        };
      });

      const subtotal = newItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
      const hasPhysicalItems = newItems.some(item => !item.isDigital);
      const newShippingAmount = hasPhysicalItems ? order.shippingAmount : 0;
      const newTaxAmount = calculateTax({
        subtotal,
        shipping: newShippingAmount,
        discount: order.discountAmount || 0,
        address: order.shippingAddress
      });
      const newTotal = subtotal + newShippingAmount + newTaxAmount - (order.discountAmount || 0);

      await transaction.update(doc(getUnifiedDb(), 'orders', orderId), {
        items: newItems,
        shippingAmount: newShippingAmount,
        taxAmount: newTaxAmount,
        total: Math.max(0, newTotal),
        updatedAt: serverTimestamp()
      });

      if (this.orderRepo.addNote) {
        await this.orderRepo.addNote(orderId, {
          id: crypto.randomUUID(),
          authorId: actor.id,
          authorEmail: actor.email,
          text: `Swapped item: ${oldItem.name} -> ${newProduct.name}`,
          createdAt: new Date()
        }, transaction);
      }

      return true;
    });

    if (!changed) return;

    await this.audit.record({
      userId: actor.id,
      userEmail: actor.email,
      action: 'order_status_changed',
      targetId: orderId,
      details: { action: 'item_swap', old: oldProductId, new: newProductId }
    });
  }

  async upgradeShipping(orderId: string, carrier: string, service: string, actor: OrderActor): Promise<void> {
    const order = await this.orderRepo.getById(orderId);
    if (!order) throw new OrderNotFoundError(orderId);
    if (order.status !== 'confirmed' && order.status !== 'processing' && order.status !== 'pending') {
      throw new Error('Order is already shipped or delivered.');
    }

    await this.orderRepo.updateFulfillment(orderId, { shippingCarrier: carrier });
    await this.orderRepo.updateMetadata(orderId, {
      ...(order.metadata || {}),
      shippingServiceUpgrade: service,
      upgradedBy: actor.email,
      upgradedAt: new Date().toISOString()
    });

    if (this.orderRepo.addNote) {
      await this.orderRepo.addNote(orderId, {
        id: crypto.randomUUID(),
        authorId: actor.id,
        authorEmail: actor.email,
        text: `Shipping upgraded to ${carrier} ${service} (Cost waived)`,
        createdAt: new Date()
      });
    }

    await this.audit.record({
      userId: actor.id,
      userEmail: actor.email,
      action: 'order_status_changed',
      targetId: orderId,
      details: { action: 'shipping_upgrade', carrier, service }
    });
  }

  async setOrderHold(orderId: string, reason: string, actor: OrderActor): Promise<void> {
    const order = await this.orderRepo.getById(orderId);
    if (!order) throw new OrderNotFoundError(orderId);
    if (order.status !== 'confirmed' && order.status !== 'processing' && order.status !== 'pending') {
      throw new Error('Only unfulfilled orders can be placed on hold.');
    }

    await this.orderRepo.updateMetadata(orderId, {
      ...(order.metadata || {}),
      onHold: true,
      holdReason: reason,
      heldBy: actor.email,
      heldAt: new Date().toISOString()
    });

    if (this.orderRepo.addNote) {
      await this.orderRepo.addNote(orderId, {
        id: crypto.randomUUID(),
        authorId: actor.id,
        authorEmail: actor.email,
        text: `Order placed on HOLD: ${reason}`,
        createdAt: new Date()
      });
    }

    await this.audit.record({
      userId: actor.id,
      userEmail: actor.email,
      action: 'order_status_changed',
      targetId: orderId,
      details: { action: 'hold', reason }
    });
  }

  async releaseOrderHold(orderId: string, actor: OrderActor): Promise<void> {
    const order = await this.orderRepo.getById(orderId);
    if (!order) throw new OrderNotFoundError(orderId);

    const metadata = { ...(order.metadata || {}) };
    delete metadata.onHold;
    delete metadata.holdReason;
    delete metadata.heldBy;
    delete metadata.heldAt;

    await this.orderRepo.updateMetadata(orderId, metadata);

    if (this.orderRepo.addNote) {
      await this.orderRepo.addNote(orderId, {
        id: crypto.randomUUID(),
        authorId: actor.id,
        authorEmail: actor.email,
        text: 'Order hold RELEASED. Fulfillment can resume.',
        createdAt: new Date()
      });
    }

    await this.audit.record({
      userId: actor.id,
      userEmail: actor.email,
      action: 'order_status_changed',
      targetId: orderId,
      details: { action: 'release_hold' }
    });
  }

  async addOrderNote(id: string, text: string, actor: OrderActor): Promise<OrderNote> {
    const order = await this.orderRepo.getById(id);
    if (!order) throw new OrderNotFoundError(id);
    const trimmedText = text.trim();
    if (!trimmedText) throw new Error('Order note text is required.');
    if (trimmedText.length > 4000) throw new Error('Order note text must be 4000 characters or fewer.');

    const note: OrderNote = {
      id: crypto.randomUUID(),
      authorId: actor.id,
      authorEmail: actor.email,
      text: trimmedText,
      createdAt: new Date()
    };

    await this.orderRepo.addNote(id, note);

    return note;
  }

  async updateOrderFulfillment(
    id: string,
    data: { trackingNumber?: string; shippingCarrier?: string },
    actor: OrderActor
  ): Promise<void> {
    const order = await runTransaction(getUnifiedDb(), async (transaction: any) => {
      const current = await this.orderRepo.getById(id, transaction);
      if (!current) throw new OrderNotFoundError(id);
      if (current.reconciliationRequired || current.status === 'reconciling') {
        throw new Error('Order requires manual reconciliation and is locked for fulfillment updates.');
      }
      if (current.status === 'cancelled' || current.status === 'refunded') {
        throw new Error(`Cannot update fulfillment for an order in status: ${current.status}`);
      }

      const trackingNumber = data.trackingNumber?.trim();
      const shippingCarrier = data.shippingCarrier?.trim()
        || (trackingNumber ? this.inferCarrierFromTracking(trackingNumber) : undefined);
      await this.orderRepo.updateFulfillment(id, {
        trackingNumber,
        shippingCarrier,
        trackingUrl: trackingNumber ? deriveTrackingUrl({ ...current, trackingNumber } as Order) : undefined,
      }, transaction);

      if (trackingNumber) {
        const event: OrderFulfillmentEvent = {
          id: crypto.randomUUID(),
          type: 'in_transit',
          label: 'Tracking assigned',
          description: `Tracking ${trackingNumber}${shippingCarrier ? ` via ${shippingCarrier}` : ''}`,
          at: new Date(),
        };
        await this.orderRepo.addFulfillmentEvent(id, event, transaction);

        if (current.status === 'confirmed' || current.status === 'processing' || current.status === 'shipped') {
          await this.orderRepo.transitionFulfillmentState(id, ['unfulfilled', 'processing', 'shipped'], 'shipped', 'admin_tracking_assigned', transaction);
          if (current.status !== 'shipped') {
            await this.orderRepo.guardedUpdateStatus(id, [current.status], 'shipped', 'admin_tracking_assigned', transaction);
          }
        }
      }

      return current;
    });
    await this.audit.record({
      userId: actor.id,
      userEmail: actor.email,
      action: 'order_status_changed',
      targetId: id,
      details: { fulfillmentUpdate: data, previousStatus: order.status }
    });
  }

  private async releaseInventoryReservation(order: Order): Promise<void> {
    if (!order.metadata?.inventoryReserved || order.metadata.inventoryReservationReleased) return;

    const stockUpdates = coalesceStockUpdates(order.items
      .filter(item => !item.isDigital)
      .map(item => ({
        id: item.productId,
        variantId: item.variantId,
        delta: item.quantity
      })));

    if (stockUpdates.length > 0) {
      await this.productRepo.batchUpdateStock(stockUpdates);
    }

    await this.orderRepo.updateMetadata(order.id, {
      ...(order.metadata || {}),
      inventoryReservationReleased: true,
      inventoryReservationReleasedAt: new Date().toISOString(),
    });
  }

  async getReconciliationCasesReadModel(options?: { limit?: number }): Promise<any> {
    const limit = options?.limit || 50;
    const openCases = await this.orderRepo.getOpenReconciliationCases({ limit });

    const allItems = await Promise.all(
      openCases.map(async (kase) => {
        let amount: number | null = null;
        let customerName: string | null = null;
        let customerEmail: string | null = null;

        let order: any = null;
        if (kase.orderId) {
          order = await this.orderRepo.getById(kase.orderId);
          if (order) {
            amount = order.total;
            customerName = order.customerName || null;
            customerEmail = order.customerEmail || null;
          }
        }

        if (!order && kase.checkoutAttemptId) {
          const attempt = await this.orderRepo.getCheckoutAttempt(kase.checkoutAttemptId);
          if (attempt) {
            customerName = attempt.checkoutOwner || attempt.cartOwner || null;
          }
        }

        const ageMs = Date.now() - new Date(kase.createdAt).getTime();

        let authoritativeSource: 'stripe' | 'local' = 'local';
        if (kase.stripeStatus === 'succeeded' || ['paid_cancelled', 'paid_not_finalized'].includes(kase.reason)) {
          authoritativeSource = 'stripe';
        } else if (order && order.paymentState === 'paid' && ['confirmed', 'processing', 'shipped', 'delivered'].includes(order.status)) {
          authoritativeSource = 'local';
        }

        return {
          id: kase.id,
          paymentIntentId: kase.paymentIntentId,
          orderId: kase.orderId || null,
          checkoutAttemptId: kase.checkoutAttemptId || null,
          reason: kase.reason,
          severity: kase.severity,
          lifecycleState: kase.lifecycleState,
          failureClassification: kase.failureClassification || 'operator_required',
          customer: customerName || customerEmail ? { name: customerName || 'Unknown Customer', email: customerEmail || 'N/A' } : null,
          amount,
          ageMs,
          recommendedAction: kase.recommendedAction || kase.nextAction,
          nextAction: kase.nextAction,
          authoritativeSource,
          stripeStatus: kase.stripeStatus || null,
          operatorVisibleMessage: kase.operatorVisibleMessage,
          createdAt: kase.createdAt,
          updatedAt: kase.updatedAt,
        };
      })
    );

    const criticalCases: any[] = [];
    const highCases: any[] = [];
    const byFailureClass: Record<string, any[]> = {};

    allItems.forEach((item) => {
      if (item.severity === 'critical') {
        criticalCases.push(item);
      } else {
        highCases.push(item);
      }

      const fClass = item.failureClassification;
      if (!byFailureClass[fClass]) {
        byFailureClass[fClass] = [];
      }
      byFailureClass[fClass].push(item);
    });

    return {
      cases: allItems,
      grouped: {
        bySeverity: {
          critical: criticalCases,
          high: highCases,
        },
        byFailureClass,
      },
    };
  }

  async getForensicTimeline(attemptId: string): Promise<any> {
    const attempt = await this.orderRepo.getCheckoutAttempt(attemptId);
    if (!attempt) {
      throw new Error(`Checkout attempt with ID ${attemptId} not found.`);
    }

    const orderId = attempt.orderId;
    const order = orderId ? await this.orderRepo.getById(orderId) : null;

    const openCases = await this.orderRepo.getOpenReconciliationCases({ limit: 100 });
    const reconCase = openCases.find(
      (c) =>
        c.checkoutAttemptId === attemptId ||
        c.orderId === orderId ||
        (attempt.paymentIntentId && c.paymentIntentId === attempt.paymentIntentId)
    ) || null;

    const { reconstructTimeline, renderTransitionStream, correlateGroupedEvents, runAuthoritativeDiagnostics } = await import('./checkoutForensics');

    const timeline = reconstructTimeline(attempt);
    const correlation = correlateGroupedEvents(attempt, order, reconCase);
    const diagnostics = runAuthoritativeDiagnostics(attempt, order, reconCase);
    const renderedMarkdown = renderTransitionStream(timeline);

    return {
      attemptId,
      orderId,
      paymentIntentId: attempt.paymentIntentId,
      timeline,
      correlation,
      diagnostics,
      renderedMarkdown,
    };
  }

  async handleReconciliationOperatorAction(params: {
    caseId: string;
    action: 'mark_resolved' | 'retry_recovery' | 'initiate_refund_review' | 'acknowledge_external' | 'escalate';
    reason: string;
    actor: { id: string; email: string };
  }): Promise<void> {
    if (!params.reason || !params.reason.trim()) {
      throw new Error('A reason is required to perform an operator action.');
    }

    const kase = await this.orderRepo.getReconciliationCase(params.caseId);
    if (!kase) {
      throw new Error(`Reconciliation case with ID ${params.caseId} not found.`);
    }

    if (kase.lifecycleState === 'resolved') {
      if (params.action === 'mark_resolved' || params.action === 'acknowledge_external') {
        logger.info('reconciliation_operator_action_already_resolved_idempotent', { caseId: params.caseId });
        return;
      }
      throw new Error(`Stale action rejected: Reconciliation case ${params.caseId} is already resolved and cannot be modified.`);
    }

    const db = getUnifiedDb();
    const recordedAt = new Date().toISOString();
    const actionEvidence = {
      type: 'operator_action',
      value: `Action: ${params.action}, Reason: ${params.reason}, By: ${params.actor.email}`,
      recordedAt,
    };

    const newEvidence = [...(kase.evidence || []), actionEvidence];

    if (params.action === 'mark_resolved' || params.action === 'acknowledge_external') {
      await runTransaction(db, async (transaction: any) => {
        await this.orderRepo.createOrUpdateReconciliationCase({
          paymentIntentId: kase.paymentIntentId,
          reason: kase.reason,
          severity: kase.severity,
          lifecycleState: 'resolved',
          evidence: newEvidence,
          operatorVisibleMessage: `Resolved by operator: ${params.reason}`,
          nextAction: 'None - Case is resolved.',
          recommendedAction: 'None',
        }, transaction);

        if (kase.orderId) {
          const order = await this.orderRepo.getById(kase.orderId, transaction);
          if (order) {
            await this.orderRepo.transitionReconciliationState(order.id, ['needs_review', 'in_progress', 'none'], 'resolved', 'operator_resolution', transaction);
            await this.orderRepo.clearReconciliationFlag(order.id, transaction);
          }
        }
      });
    } else if (params.action === 'initiate_refund_review') {
      await runTransaction(db, async (transaction: any) => {
        await this.orderRepo.createOrUpdateReconciliationCase({
          paymentIntentId: kase.paymentIntentId,
          reason: kase.reason,
          severity: kase.severity,
          lifecycleState: 'in_progress',
          evidence: newEvidence,
          operatorVisibleMessage: kase.operatorVisibleMessage,
          nextAction: 'refund_review_active',
          recommendedAction: 'Review the refund review request manually using the RefundService.',
        }, transaction);
      });
    } else if (params.action === 'escalate') {
      await runTransaction(db, async (transaction: any) => {
        await this.orderRepo.createOrUpdateReconciliationCase({
          paymentIntentId: kase.paymentIntentId,
          reason: kase.reason,
          severity: kase.severity,
          lifecycleState: 'blocked',
          evidence: newEvidence,
          operatorVisibleMessage: `Escalated: ${params.reason}`,
          nextAction: 'Manual investigation escalated to senior support engineering.',
          recommendedAction: 'Inspect the audit logs and Firestore raw document states.',
        }, transaction);
      });
    } else if (params.action === 'retry_recovery') {
      if (kase.reason !== 'paid_not_finalized') {
        throw new Error(`Automated recovery is not supported for case reason '${kase.reason}'. Manual resolution is required.`);
      }
      await runTransaction(db, async (transaction: any) => {
        await this.orderRepo.createOrUpdateReconciliationCase({
          paymentIntentId: kase.paymentIntentId,
          reason: kase.reason,
          severity: kase.severity,
          lifecycleState: 'repair_attempted',
          evidence: newEvidence,
          operatorVisibleMessage: kase.operatorVisibleMessage,
          nextAction: 'Automated recovery attempt in progress.',
        }, transaction);
      });
    }

    await this.audit.record({
      userId: params.actor.id,
      userEmail: params.actor.email,
      action: 'reconciliation_operator_action',
      targetId: params.caseId,
      details: {
        action: params.action,
        reason: params.reason,
        caseReason: kase.reason,
      },
    });
  }
}
