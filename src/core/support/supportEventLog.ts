export type SupportEventSource = 'admin' | 'customer' | 'concierge' | 'system';

export type SupportEventAction =
  | 'ticket.created'
  | 'ticket.assigned'
  | 'ticket.message_added'
  | 'ticket.linked_order'
  | 'ticket.resolved'
  | 'ticket.closed'
  | 'ticket.reopened'
  | 'ticket.updated';

export type SupportEvent = {
  id: string;
  actorId: string;
  source: SupportEventSource;
  action: SupportEventAction;
  ticketId?: string;
  customerId?: string;
  orderId?: string;
  reason?: string;
  idempotencyKey: string;
  createdAt: string;
};

export type SupportMutationClaimResult = 'new' | 'completed';

export interface ISupportEventLog {
  claimMutation(idempotencyKey: string): Promise<SupportMutationClaimResult>;
  markMutationCompleted(idempotencyKey: string): Promise<void>;
  recordEvent(event: SupportEvent): Promise<void>;
  findByIdempotencyKey(idempotencyKey: string): Promise<SupportEvent | null>;
}

export function supportMutationKey(
  action: string,
  targetId: string,
  actorId: string,
  key?: string,
): string {
  if (key?.trim()) return key.trim();
  return `support:${action}:${targetId}:${actorId}`;
}
