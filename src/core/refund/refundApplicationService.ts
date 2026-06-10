import type { OrderStatus } from '@domain/models';
import type { RefundSource } from './refundEventLog';
import type { RefundResult } from './refundResult';

export type CreateRefundInput = {
  orderId: string;
  amount: number;
  idempotencyKey: string;
  reason: string;
  actor: { id: string; email: string };
  source?: RefundSource;
};

export type CreateRefundResult = {
  orderId: string;
  amount: number;
  status: Extract<OrderStatus, 'refunded' | 'partially_refunded'>;
  stripeRefundId?: string;
  idempotencyKey: string;
};

export type GetRefundStatusInput = {
  orderId: string;
};

export type RefundStatusResult = {
  orderId: string;
  refundedAmount: number;
  refundableBalance: number;
  processedRefundKeys: string[];
  stripeRefunds: Array<{ id: string; amount: number; idempotencyKey: string }>;
};

/**
 * Public refund boundary. Admin and authorized callers depend on this interface.
 */
export interface RefundApplicationService {
  createRefund(input: CreateRefundInput): Promise<RefundResult<CreateRefundResult>>;
  getRefundStatus(input: GetRefundStatusInput): Promise<RefundResult<RefundStatusResult>>;
}
