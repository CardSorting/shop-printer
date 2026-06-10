import { NextResponse } from 'next/server';
import { getServerServices } from '@infrastructure/server/services';
import { supportRouteResponse } from '@infrastructure/server/supportRouteAdapter';
import { jsonError, readJsonObject, requireSessionUser } from '@infrastructure/server/apiGuards';
import { DomainError } from '@domain/errors';
import type { TicketPriority, TicketType } from '@domain/models';

const TICKET_TYPES = new Set<TicketType>(['question', 'incident', 'problem', 'task']);
const TICKET_PRIORITIES = new Set<TicketPriority>(['low', 'medium', 'high', 'urgent']);
const MAX_TEXT_LENGTH = 5_000;

function requiredText(value: unknown, field: string, maxLength = MAX_TEXT_LENGTH): string {
  if (typeof value !== 'string' || !value.trim()) throw new DomainError(`${field} is required.`);
  const trimmed = value.trim();
  if (trimmed.length > maxLength) throw new DomainError(`${field} is too long.`);
  return trimmed;
}

function optionalText(value: unknown, field: string, maxLength = 200): string | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  return requiredText(value, field, maxLength);
}

export async function GET(req: Request) {
  try {
    const user = await requireSessionUser();
    const services = await getServerServices();
    const result = await services.support.listTickets({ userId: user.id });
    return supportRouteResponse(result);
  } catch (err) {
    return jsonError(err, 'Failed to load support tickets');
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireSessionUser();
    const data = await readJsonObject(req);
    const requestedType = optionalText(data.type, 'type', 30) as TicketType | undefined;
    const requestedPriority = optionalText(data.priority, 'priority', 30) as TicketPriority | undefined;
    const initialMessage = Array.isArray(data.messages) && data.messages[0]
      ? requiredText((data.messages[0] as Record<string, unknown>).content, 'message')
      : requiredText(data.message ?? data.content, 'message');
    const type = requestedType && TICKET_TYPES.has(requestedType) ? requestedType : 'question';
    const priority = requestedPriority && TICKET_PRIORITIES.has(requestedPriority) ? requestedPriority : 'medium';
    const idempotencyKey = optionalText(data.idempotencyKey, 'idempotencyKey') ?? `ticket.create:${user.id}:${requiredText(data.subject, 'subject', 200)}`;

    const services = await getServerServices();
    const result = await services.support.createTicket({
      actor: { id: user.id, email: user.email, name: user.displayName },
      source: 'customer',
      idempotencyKey,
      userId: user.id,
      customerEmail: user.email,
      customerName: user.displayName || undefined,
      orderId: optionalText(data.orderId, 'orderId'),
      productId: optionalText(data.productId, 'productId'),
      subject: requiredText(data.subject, 'subject', 200),
      message: initialMessage,
      type,
      priority,
      tags: [type],
    });

    return supportRouteResponse(result);
  } catch (err) {
    return jsonError(err, 'Failed to create support ticket');
  }
}
