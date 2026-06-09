export type CheckoutEventClaimResult = 'new' | 'completed' | 'in_progress';

export interface ICheckoutEventLog {
  claimRecoveryAttempt(key: string): Promise<CheckoutEventClaimResult>;
  markRecoveryAttemptCompleted(key: string): Promise<void>;
  markRecoveryAttemptFailed(key: string, error: string): Promise<void>;

  claimOperatorAction(key: string): Promise<'new' | 'completed'>;
  markOperatorActionCompleted(key: string): Promise<void>;
}

export function recoveryAttemptKey(caseId: string): string {
  return `recovery:${caseId}`;
}

export function operatorActionKey(caseId: string, action: string, actorId: string): string {
  return `operator:${caseId}:${action}:${actorId}`;
}
