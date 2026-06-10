import type { AdminOperatorEvent } from './adminTypes';

export type AdminMutationClaimResult = 'new' | 'completed';

export interface IAdminOperatorEventLog {
  claimMutation(idempotencyKey: string): Promise<AdminMutationClaimResult>;
  markMutationCompleted(idempotencyKey: string): Promise<void>;
  recordEvent(event: AdminOperatorEvent): Promise<void>;
}

export function adminMutationKey(action: string, targetId: string, actorId: string, key?: string): string {
  if (key?.trim()) return key.trim();
  return `admin:${action}:${targetId}:${actorId}`;
}
