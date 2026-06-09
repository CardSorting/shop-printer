/**
 * [LAYER: CORE]
 * Handles order status updates, batch operations, and system maintenance tasks.
 */
import type { 
  IOrderRepository 
} from '@domain/repositories';
import { 
  Order,
  OrderStatus 
} from '@domain/models';
import { OrderNotFoundError } from '@domain/errors';
import { assertValidOrderStatusTransition } from '@domain/rules';
import { AuditService } from './AuditService';
import { logger } from '@utils/logger';

export class OrderManagementService {
  constructor(
    private orderRepo: IOrderRepository,
    private audit: AuditService
  ) {}

  private isPaidPaymentState(order: Order): boolean {
    return order.paymentState === 'paid' || order.paymentState === 'partially_refunded' || order.paymentState === 'refunded';
  }

  async updateOrderStatus(id: string, status: OrderStatus, actor: { id: string, email: string }): Promise<void> {
    const order = await this.orderRepo.getById(id);
    if (!order) throw new OrderNotFoundError(id);
    if (order.reconciliationRequired) {
      throw new Error('Order requires manual reconciliation and is locked.');
    }
    assertValidOrderStatusTransition(order.status, status);
    if (status === 'refunded' || status === 'partially_refunded') {
      throw new Error('Refund status changes must be processed through the refund workflow.');
    }
    if (status === 'cancelled' && this.isPaidPaymentState(order)) {
      throw new Error('Cannot cancel a paid order through OrderManagementService; use checkout reconciliation workflow.');
    }
    if (status === 'cancelled') {
      await this.orderRepo.transitionPaymentState(id, ['unpaid', 'requires_payment_method', 'processing', 'failed'], 'cancelled', 'order_management_status_update');
      await this.orderRepo.transitionFulfillmentState(id, ['unfulfilled', 'processing', 'ready_for_pickup', 'delivery_started'], 'cancelled', 'order_management_status_update');
    }
    await this.orderRepo.guardedUpdateStatus(id, [order.status], status, 'order_management_status_update');
    await this.audit.record({ userId: actor.id, userEmail: actor.email, action: 'order_status_changed', targetId: id, details: { from: order.status, to: status } });
  }

  async batchUpdateOrderStatus(ids: string[], status: OrderStatus, actor: { id: string, email: string }): Promise<void> {
    for (const id of ids) {
      await this.updateOrderStatus(id, status, actor);
    }
    await this.audit.record({ 
      userId: actor.id, 
      userEmail: actor.email, 
      action: 'order_status_changed', 
      targetId: 'batch', 
      details: { ids, to: status } 
    });
  }

  async markHeartbeat(orderId: string, userId: string, email: string): Promise<void> {
    return this.orderRepo.markHeartbeat(orderId, userId, email);
  }

}
