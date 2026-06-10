import type { SupportTicket, TicketMessage, TicketPriority, TicketStatus, TicketType } from '@domain/models';

export type SupportActor = {
  id: string;
  email?: string;
  name?: string;
};

export type SupportSource = 'admin' | 'customer' | 'concierge' | 'system';

export type TicketResult = SupportTicket;
export type TicketMessageResult = TicketMessage;
export type TicketOrderLinkResult = { ticketId: string; orderId: string };

export type CreateTicketInput = {
  actor: SupportActor;
  source: SupportSource;
  idempotencyKey: string;
  userId: string;
  customerEmail: string;
  customerName?: string;
  subject: string;
  message: string;
  orderId?: string;
  productId?: string;
  type?: TicketType;
  priority?: TicketPriority;
  tags?: string[];
  visibility?: 'public' | 'internal';
};

export type UpdateTicketInput = {
  actor: SupportActor;
  source: SupportSource;
  idempotencyKey: string;
  ticketId: string;
  patch: Partial<Pick<
    SupportTicket,
    'status' | 'priority' | 'type' | 'assigneeId' | 'assigneeName' | 'orderId' | 'productId' | 'subject' | 'tags' | 'slaDeadline'
  >>;
  reason?: string;
};

export type AssignTicketInput = {
  actor: SupportActor;
  source: SupportSource;
  idempotencyKey: string;
  ticketId: string;
  assigneeId: string;
  assigneeName: string;
  reason?: string;
};

export type CloseTicketInput = {
  actor: SupportActor;
  source: SupportSource;
  idempotencyKey: string;
  ticketId: string;
  reason?: string;
};

export type ReopenTicketInput = {
  actor: SupportActor;
  source: SupportSource;
  idempotencyKey: string;
  ticketId: string;
  reason: string;
};

export type AddTicketMessageInput = {
  actor: SupportActor;
  source: SupportSource;
  idempotencyKey: string;
  ticketId: string;
  content: string;
  visibility?: 'public' | 'internal';
  senderType?: TicketMessage['senderType'];
};

export type LinkTicketToOrderInput = {
  actor: SupportActor;
  source: SupportSource;
  idempotencyKey: string;
  ticketId: string;
  orderId: string;
  reason?: string;
};

export type ListTicketsInput = {
  status?: TicketStatus | 'all';
  userId?: string;
  assigneeId?: string;
  limit?: number;
};

export type GetTicketInput = {
  ticketId: string;
  userId?: string;
};

export type BatchUpdateTicketsInput = {
  actor: SupportActor;
  source: SupportSource;
  idempotencyKey: string;
  ticketIds: string[];
  patch: UpdateTicketInput['patch'];
  reason?: string;
};

export const CANONICAL_TICKET_STATUSES: readonly TicketStatus[] = [
  'new',
  'open',
  'pending_customer',
  'pending_internal',
  'resolved',
  'closed',
  'reopened',
] as const;

const LEGACY_STATUS_MAP: Record<string, TicketStatus> = {
  pending: 'pending_customer',
  on_hold: 'pending_internal',
  solved: 'resolved',
};

export function normalizeTicketStatus(status: string): TicketStatus | null {
  if ((CANONICAL_TICKET_STATUSES as readonly string[]).includes(status)) {
    return status as TicketStatus;
  }
  return LEGACY_STATUS_MAP[status] ?? null;
}

const ALLOWED_TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  new: ['open', 'pending_customer', 'pending_internal', 'resolved', 'closed'],
  open: ['pending_customer', 'pending_internal', 'resolved', 'closed'],
  pending_customer: ['open', 'pending_internal', 'resolved', 'closed'],
  pending_internal: ['open', 'pending_customer', 'resolved', 'closed'],
  resolved: ['closed', 'open', 'reopened'],
  closed: ['reopened', 'open'],
  reopened: ['open', 'pending_customer', 'pending_internal', 'resolved', 'closed'],
};

export function assertTicketTransition(from: TicketStatus, to: TicketStatus): string | null {
  const normalizedFrom = normalizeTicketStatus(from);
  const normalizedTo = normalizeTicketStatus(to);
  if (!normalizedFrom || !normalizedTo) return 'Ticket status is invalid.';
  if (normalizedFrom === normalizedTo) return null;
  const allowed = ALLOWED_TRANSITIONS[normalizedFrom] ?? [];
  if (!allowed.includes(normalizedTo)) {
    return `Cannot transition ticket from "${normalizedFrom}" to "${normalizedTo}".`;
  }
  return null;
}
