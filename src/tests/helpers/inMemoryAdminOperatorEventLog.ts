import type { AdminOperatorEvent } from '../../core/admin/adminTypes';
import type { AdminMutationClaimResult, IAdminOperatorEventLog } from '../../core/admin/adminOperatorEventLog';

export class InMemoryAdminOperatorEventLog implements IAdminOperatorEventLog {
  readonly claims = new Map<string, 'in_progress' | 'completed'>();
  readonly events: AdminOperatorEvent[] = [];

  async claimMutation(idempotencyKey: string): Promise<AdminMutationClaimResult> {
    if (this.claims.get(idempotencyKey) === 'completed') return 'completed';
    this.claims.set(idempotencyKey, 'in_progress');
    return 'new';
  }

  async markMutationCompleted(idempotencyKey: string): Promise<void> {
    this.claims.set(idempotencyKey, 'completed');
  }

  async recordEvent(event: AdminOperatorEvent): Promise<void> {
    this.events.push(event);
  }
}
