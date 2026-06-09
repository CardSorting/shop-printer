import type { CheckoutEventClaimResult, ICheckoutEventLog } from '../../core/order/checkoutEventLog';

export class InMemoryCheckoutEventLog implements ICheckoutEventLog {
  private readonly recovery = new Map<string, 'in_progress' | 'completed' | 'failed'>();
  private readonly operator = new Map<string, 'in_progress' | 'completed'>();

  async claimRecoveryAttempt(key: string): Promise<CheckoutEventClaimResult> {
    const current = this.recovery.get(key);
    if (current === 'completed') return 'completed';
    if (current === 'in_progress') return 'in_progress';
    this.recovery.set(key, 'in_progress');
    return 'new';
  }

  async markRecoveryAttemptCompleted(key: string): Promise<void> {
    this.recovery.set(key, 'completed');
  }

  async markRecoveryAttemptFailed(key: string): Promise<void> {
    this.recovery.set(key, 'failed');
  }

  async claimOperatorAction(key: string): Promise<'new' | 'completed'> {
    if (this.operator.get(key) === 'completed') return 'completed';
    this.operator.set(key, 'in_progress');
    return 'new';
  }

  async markOperatorActionCompleted(key: string): Promise<void> {
    this.operator.set(key, 'completed');
  }
}
