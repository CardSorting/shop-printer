export type RefundSource = 'admin' | 'concierge' | 'system';

export type RefundExecutionEvent = {
  id: string;
  idempotencyKey: string;
  orderId: string;
  amount: number;
  stripeRefundId?: string;
  actorId: string;
  actorEmail: string;
  reason?: string;
  source?: RefundSource;
  createdAt: string;
};

export type RefundExecutionClaimResult = 'new' | 'completed';

export interface IRefundEventLog {
  claimRefundExecution(idempotencyKey: string): Promise<RefundExecutionClaimResult>;
  markRefundExecutionCompleted(idempotencyKey: string): Promise<void>;
  markRefundExecutionFailed(idempotencyKey: string, error: string): Promise<void>;
  recordExecution(event: RefundExecutionEvent): Promise<void>;
  findByIdempotencyKey(idempotencyKey: string): Promise<RefundExecutionEvent | null>;
}
