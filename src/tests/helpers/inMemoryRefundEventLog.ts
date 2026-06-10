import type { IRefundEventLog, RefundExecutionEvent } from '../../core/refund/refundEventLog';

export class InMemoryRefundEventLog implements IRefundEventLog {
  readonly claims = new Map<string, 'in_progress' | 'completed' | 'failed'>();
  readonly events: RefundExecutionEvent[] = [];

  async claimRefundExecution(idempotencyKey: string) {
    if (this.claims.get(idempotencyKey) === 'completed') return 'completed' as const;
    this.claims.set(idempotencyKey, 'in_progress');
    return 'new' as const;
  }

  async markRefundExecutionCompleted(idempotencyKey: string): Promise<void> {
    this.claims.set(idempotencyKey, 'completed');
  }

  async markRefundExecutionFailed(idempotencyKey: string): Promise<void> {
    this.claims.set(idempotencyKey, 'failed');
  }

  async recordExecution(event: RefundExecutionEvent): Promise<void> {
    this.events.push(event);
  }

  async findByIdempotencyKey(idempotencyKey: string): Promise<RefundExecutionEvent | null> {
    return this.events.find((event) => event.idempotencyKey === idempotencyKey) ?? null;
  }
}
