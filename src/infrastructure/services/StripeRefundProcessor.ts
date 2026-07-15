import type { IRefundProcessor } from '@domain/repositories';
import { PaymentFailedError } from '@domain/errors';
import Stripe from 'stripe';
import { AuditService } from '@core/AuditService';

/** Stripe adapter restricted to refunds. Checkout capture is owned by StripeService. */
export class StripeRefundProcessor implements IRefundProcessor {
  private stripe: Stripe;
  private audit: AuditService;

  constructor(auditService?: AuditService) {
    this.audit = auditService || new AuditService();
    const secretKey = process.env.STRIPE_SECRET_KEY?.trim() || '';
    this.stripe = new Stripe(secretKey, {
      apiVersion: '2025-02-11-preview' as any,
      typescript: true,
    });
  }

  async refundPayment(transactionId: string, amount: number, idempotencyKey: string): Promise<{ success: boolean; refundId?: string; status?: string }> {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new PaymentFailedError('Stripe processor is not configured.');
    }

    try {
      const refund = await this.stripe.refunds.create({
        payment_intent: transactionId,
        amount: Math.trunc(amount),
      }, {
        idempotencyKey,
      });

      const success = refund.status === 'succeeded' || refund.status === 'pending';
      await this.audit.record({
        userId: 'system',
        userEmail: 'refunds@woodbine.com',
        action: 'order_refunded',
        targetId: transactionId,
        details: { amount, status: refund.status, success, refundId: refund.id },
      });
      return { success, refundId: refund.id, status: refund.status ?? undefined };
    } catch (error: any) {
      const message = error.message || 'Stripe refund request failed.';
      throw new PaymentFailedError(message);
    }
  }
}
