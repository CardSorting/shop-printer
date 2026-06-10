import type { SupportTicket, TicketPriority, TicketStatus, TicketType } from '@domain/models';
import { DomainError } from '@domain/errors';
import { optionalString, optionalStringArray, parseBoundedLimit, requireString } from '@infrastructure/server/apiGuards';

const TICKET_STATUSES = new Set<TicketStatus>([
  'new',
  'open',
  'pending_customer',
  'pending_internal',
  'resolved',
  'closed',
  'reopened',
]);
const LEGACY_TICKET_STATUSES: Record<string, TicketStatus> = {
  pending: 'pending_customer',
  on_hold: 'pending_internal',
  solved: 'resolved',
};
const TICKET_PRIORITIES = new Set<TicketPriority>(['low', 'medium', 'high', 'urgent']);
const TICKET_TYPES = new Set<TicketType>(['question', 'incident', 'problem', 'task']);
const MAX_BATCH_SIZE = 100;

export type TicketListOptions = {
  status?: TicketStatus;
  limit?: number;
};

export type TicketMutableProperties = Partial<Pick<
  SupportTicket,
  'status' | 'priority' | 'type' | 'assigneeId' | 'assigneeName' | 'orderId' | 'productId' | 'subject' | 'tags' | 'slaDeadline'
>>;

export function parseTicketListOptions(searchParams: URLSearchParams): TicketListOptions {
  return {
    status: parseTicketStatus(searchParams.get('status'), false),
    limit: parseBoundedLimit(searchParams.get('limit'), 50, 100),
  };
}

export function parseTicketStatusUpdate(body: Record<string, unknown>): TicketStatus {
  return parseTicketStatus(body.status, true);
}

export function parseTicketPriorityUpdate(body: Record<string, unknown>): TicketPriority {
  return parseTicketPriority(body.priority, true);
}

export function parseTicketProperties(body: Record<string, unknown>): TicketMutableProperties {
  const update: TicketMutableProperties = {
    status: parseTicketStatus(body.status, false),
    priority: parseTicketPriority(body.priority, false),
    type: parseTicketType(body.type),
    assigneeId: optionalString(body.assigneeId, 'assigneeId'),
    assigneeName: optionalString(body.assigneeName, 'assigneeName'),
    orderId: optionalString(body.orderId, 'orderId'),
    productId: optionalString(body.productId, 'productId'),
    subject: optionalBoundedString(body.subject, 'subject', 200),
    tags: parseTags(body.tags),
    slaDeadline: parseOptionalDate(body.slaDeadline, 'slaDeadline'),
  };
  const clean = stripUndefined(update) as TicketMutableProperties;
  if (Object.keys(clean).length === 0) throw new DomainError('At least one ticket property is required.');
  return clean;
}

export function parseTicketBatchUpdate(body: Record<string, unknown>): { ids: string[]; updates: TicketMutableProperties } {
  if (!Array.isArray(body.ids)) throw new DomainError('ids must be a list.');
  const ids = body.ids.map((id, index) => requireString(id, `ids[${index}]`));
  if (ids.length === 0) throw new DomainError('At least one ticket id is required.');
  if (ids.length > MAX_BATCH_SIZE) throw new DomainError(`Batch ticket updates are limited to ${MAX_BATCH_SIZE} tickets.`);
  if (new Set(ids).size !== ids.length) throw new DomainError('Duplicate ticket ids are not allowed.');
  if (!body.updates || typeof body.updates !== 'object' || Array.isArray(body.updates)) {
    throw new DomainError('updates must be a JSON object.');
  }
  return {
    ids,
    updates: parseTicketProperties(body.updates as Record<string, unknown>),
  };
}

export function parseTicketHeartbeat(body: Record<string, unknown>): { userId: string; userName: string } {
  return {
    userId: requireString(body.userId, 'userId'),
    userName: requireString(body.userName, 'userName'),
  };
}

function parseTicketStatus(value: unknown, required: true): TicketStatus;
function parseTicketStatus(value: unknown, required?: false): TicketStatus | undefined;
function parseTicketStatus(value: unknown, required = false): TicketStatus | undefined {
  if (value === undefined || value === null || value === '') {
    if (required) throw new DomainError('status is required.');
    return undefined;
  }
  if (typeof value === 'string') {
    if (TICKET_STATUSES.has(value as TicketStatus)) return value as TicketStatus;
    const legacy = LEGACY_TICKET_STATUSES[value];
    if (legacy) return legacy;
  }
  throw new DomainError('Ticket status is invalid.');
}

function parseTicketPriority(value: unknown, required: true): TicketPriority;
function parseTicketPriority(value: unknown, required?: false): TicketPriority | undefined;
function parseTicketPriority(value: unknown, required = false): TicketPriority | undefined {
  if (value === undefined || value === null || value === '') {
    if (required) throw new DomainError('priority is required.');
    return undefined;
  }
  if (typeof value === 'string' && TICKET_PRIORITIES.has(value as TicketPriority)) return value as TicketPriority;
  throw new DomainError('Ticket priority is invalid.');
}

function parseTicketType(value: unknown): TicketType | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value === 'string' && TICKET_TYPES.has(value as TicketType)) return value as TicketType;
  throw new DomainError('Ticket type is invalid.');
}

function parseTags(value: unknown): string[] | undefined {
  const tags = optionalStringArray(value, 'tags');
  if (!tags) return undefined;
  const normalized = tags.map((tag) => tag.toLowerCase()).filter(Boolean).slice(0, 20);
  return [...new Set(normalized)];
}

function parseOptionalDate(value: unknown, field: string): Date | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value !== 'string') throw new DomainError(`${field} must be a date string.`);
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new DomainError(`${field} must be a valid date.`);
  return date;
}

function optionalBoundedString(value: unknown, field: string, maxLength: number): string | undefined {
  const stringValue = optionalString(value, field);
  if (!stringValue) return undefined;
  if (stringValue.length > maxLength) throw new DomainError(`${field} must be ${maxLength} characters or fewer.`);
  return stringValue;
}

function stripUndefined<T extends Record<string, unknown>>(value: T): Partial<T> {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined)) as Partial<T>;
}
