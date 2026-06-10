import type { 
  IOrderRepository, 
  IPaymentProcessor,
  IProductRepository 
} from '@domain/repositories';
import type { OrderStatus, PaymentState } from '@domain/models';
import { OrderNotFoundError } from '@domain/errors';
import { assertValidOrderStatusTransition } from '@domain/rules';
import { runTransaction, getUnifiedDb } from '@infrastructure/firebase/bridge';
import { AuditService } from './AuditService';
import type { InventoryApplicationService } from './inventory/inventoryApplicationService';
import { logger } from '@utils/logger';

export type ProcessRefundResult = {
  orderId: string;
  amount: number;
  status: Extract<OrderStatus, 'refunded' | 'partially_refunded'>;
  stripeRefundId?: string;
  idempotencyKey: string;
  duplicate?: boolean;
};

export class RefundService {
  constructor(
    private orderRepo: IOrderRepository,
    private payment: IPaymentProcessor,
    private audit: AuditService,
    private productRepo?: IProductRepository,
    private discountRepo?: import('@domain/repositories').IDiscountRepository,
    private locker?: import('@domain/repositories').ILockProvider,
    private inventory: InventoryApplicationService,
  ) {}

  async processRefund(orderId: string, amount: number, actor: { id: string, email: string }, refundAttemptId: string): Promise<ProcessRefundResult> {
    // 0. Production Hardening: Acquire distributed lock to prevent double-refund races
    const lockId = `refund_lock:${orderId}`;
    let fencingToken: number | null = null;
    if (this.locker) {
        const { success, fencingToken: token } = await this.locker.acquireLock(lockId, actor.id, 60000);
        if (!success) throw new Error('A refund is already in progress for this order.');
        fencingToken = token;
    }

    try {
      const order = await this.orderRepo.getById(orderId);
      if (!order) throw new OrderNotFoundError(orderId);

      // Point 7: Reconciliation Abuse Block — no refunds on locked orders
      if (order.reconciliationRequired || order.status === 'reconciling') {
        throw new Error('Cannot process refund: order requires manual reconciliation.');
      }

      if (!order.paymentTransactionId) {
        throw new Error('Cannot refund order without a payment transaction ID.');
      }

      // Production Hardening: Validate refund amount against current refundable balance
      // This prevents the "Double-Partial Refund" exploit.
      const alreadyRefunded = order.refundedAmount || 0;
      const refundableBalance = order.total - alreadyRefunded;

      if (!Number.isFinite(amount) || amount <= 0) {
        throw new Error('Refund amount must be a positive number.');
      }
      if (!refundAttemptId?.trim()) {
        throw new Error('refundAttemptId is required for refund idempotency.');
      }
      if (refundableBalance <= 0) {
        throw new Error('This order has no refundable balance remaining.');
      }
      
      const safeAmount = Math.min(Math.trunc(amount), refundableBalance);

      // Production Hardening: Determine full vs partial refund based on REMAINDER
      const isFullRefund = (alreadyRefunded + safeAmount) >= order.total;
      const nextStatus: OrderStatus = isFullRefund ? 'refunded' : 'partially_refunded';
      const nextPaymentState: PaymentState = isFullRefund ? 'refunded' : 'partially_refunded';

      // Validate status transition before processing payment
      assertValidOrderStatusTransition(order.status, nextStatus);

      // Point 2: Deterministic Idempotency Keys (Granular)
      // Format: refund:{orderId}:{refundAttemptId}:{amount}
      const refundIdempotencyKey = `refund:${orderId}:${refundAttemptId}:${safeAmount}`;
      
      const processedRefundKeys = order.metadata?.processedRefundKeys || [];
      if (processedRefundKeys.includes(refundIdempotencyKey)) {
        logger.info(`[RefundService] Duplicate refund attempt detected. Key ${refundIdempotencyKey} already transactionally processed. Returning success (idempotent resume).`);
        const existingRefunds = (order.metadata?.stripeRefunds as Array<{ id: string; amount: number; idempotencyKey: string }> | undefined) || [];
        const existing = existingRefunds.find((entry) => entry.idempotencyKey === refundIdempotencyKey);
        return {
          orderId,
          amount: existing?.amount ?? safeAmount,
          status: (order.status === 'refunded' || order.status === 'partially_refunded')
            ? order.status
            : nextStatus,
          stripeRefundId: existing?.id,
          idempotencyKey: refundIdempotencyKey,
          duplicate: true,
        };
      }
      
      const result = await this.payment.refundPayment(order.paymentTransactionId, safeAmount, refundIdempotencyKey);
      
      if (result.success) {
        try {
          // Production Hardening: Perform all post-payment state mutations ATOMICALLY 
          await runTransaction(getUnifiedDb(), async (transaction: any) => {
            // 1. Update Order Status and Atomic Refund Amount
            await this.orderRepo.transitionPaymentState(orderId, ['paid', 'partially_refunded'], nextPaymentState, 'refund_processed', transaction);
            await this.orderRepo.guardedUpdateStatus(orderId, [order.status], nextStatus, 'refund_processed', transaction);
            await this.orderRepo.recordRefund(orderId, safeAmount, transaction);

            // 1.5 Update order metadata with the processed refund idempotency key
            const currentMetadata = order.metadata || {};
            const nextKeys = [...(currentMetadata.processedRefundKeys || []), refundIdempotencyKey];
            const stripeRefunds = [
              ...((currentMetadata.stripeRefunds as Array<{ id: string; amount: number; idempotencyKey: string }>) || []),
              {
                id: result.refundId || refundIdempotencyKey,
                amount: safeAmount,
                idempotencyKey: refundIdempotencyKey,
              },
            ];
            await this.orderRepo.updateMetadata(orderId, {
              ...currentMetadata,
              processedRefundKeys: nextKeys,
              stripeRefunds,
              lastStripeRefundId: result.refundId,
            }, transaction);

            // 2. Restock inventory (physical items only)
            if (isFullRefund) {
              const restockDeltas = order.items
                .filter((line) => !line.isDigital)
                .map((item) => ({
                  productId: item.productId,
                  variantId: item.variantId,
                  delta: item.quantity,
                }));
              if (restockDeltas.length > 0) {
                const restockResult = await this.inventory.applyInventoryDeltas({
                  deltas: restockDeltas,
                  idempotencyKey: `refund-restock:${refundIdempotencyKey}`,
                  actor: 'fulfillment',
                  reason: 'reconciliation',
                  orderId,
                  transaction,
                });
                if (!restockResult.ok) throw new Error(restockResult.message);
              }
            }

            // 3. Rollback discount usage
            if (isFullRefund && order.discountCode && this.discountRepo) {
              const discount = await this.discountRepo.getByCode(order.discountCode, transaction);
              if (discount) {
                await this.discountRepo.decrementUsage(discount.id, transaction);
              }
            }

            // 4. Record Audit (Transactional)
            await this.audit.recordWithTransaction(transaction, {
              userId: actor.id,
              userEmail: actor.email,
              action: 'order_refunded',
              targetId: orderId,
              details: { amount: safeAmount, status: nextStatus, isFullRefund, idempotencyKey: refundIdempotencyKey }
            });
          });
        } catch (dbError) {
          // Point 7: Refund Partial Failure (Stripe success, DB fail)
          // CRITICAL: We MUST mark the order as requiring manual reconciliation.
          logger.error(`CRITICAL: Stripe refund succeeded but DB update failed for order ${orderId}. Marking for RECONCILIATION.`, dbError);
          
          await this.orderRepo.transitionReconciliationState(orderId, ['none', 'needs_review'], 'needs_review', 'stripe_refund_db_failure').catch(error => {
            logger.error('Failed to transition reconciliation state after Stripe refund DB failure', { orderId, error });
          });
          await this.orderRepo.guardedUpdateStatus(orderId, [order.status], 'reconciling', 'stripe_refund_db_failure');
          await this.orderRepo.markForReconciliation(orderId, [
            `Stripe refund of ${safeAmount} succeeded (Key: ${refundIdempotencyKey}) but DB transaction failed.`,
            `Error: ${dbError instanceof Error ? dbError.message : 'Unknown'}`
          ]);
          
          throw new Error('Refund succeeded in Stripe but failed to update order state. Order marked for reconciliation.');
        }
        
        logger.info(`[RefundService] Refund processed and state synchronized for order ${orderId}`);
        return {
          orderId,
          amount: safeAmount,
          status: nextStatus,
          stripeRefundId: result.refundId,
          idempotencyKey: refundIdempotencyKey,
        };
      } else {
        // Production Hardening: Audit the failed refund attempt for forensic traceability
        await this.audit.record({
          userId: actor.id,
          userEmail: actor.email,
          action: 'order_refunded',
          targetId: orderId,
          details: { amount: safeAmount, status: 'failed', isFullRefund, error: 'Payment processor rejected refund' }
        }).catch(() => {}); // swallow audit failure — don't mask the primary error
        throw new Error('Payment processor failed to issue refund.');
      }
    } finally {
      if (this.locker) {
        await Promise.resolve(this.locker.releaseLock(lockId, actor.id, fencingToken ?? undefined)).catch(err => {
          logger.error(`Failed to release refund lock for ${orderId}`, err);
        });
      }
    }
  }
}
