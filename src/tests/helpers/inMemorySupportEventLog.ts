import type { ISupportEventLog, SupportEvent } from '@core/support/supportEventLog';

export class InMemorySupportEventLog implements ISupportEventLog {
  readonly claims = new Map<string, 'in_progress' | 'completed'>();
  readonly events: SupportEvent[] = [];

  async claimMutation(idempotencyKey: string) {
    if (this.claims.get(idempotencyKey) === 'completed') return 'completed' as const;
    this.claims.set(idempotencyKey, 'in_progress');
    return 'new' as const;
  }

  async markMutationCompleted(idempotencyKey: string): Promise<void> {
    this.claims.set(idempotencyKey, 'completed');
  }

  async recordEvent(event: SupportEvent): Promise<void> {
    this.events.push(event);
  }

  async findByIdempotencyKey(idempotencyKey: string): Promise<SupportEvent | null> {
    return this.events.find((event) => event.idempotencyKey === idempotencyKey) ?? null;
  }
}
