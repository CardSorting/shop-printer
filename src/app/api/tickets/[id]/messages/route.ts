import { getServerServices } from '@infrastructure/server/services';
import { supportRouteResponse } from '@infrastructure/server/supportRouteAdapter';
import { jsonError, readJsonObject, requireSessionUser, optionalString } from '@infrastructure/server/apiGuards';
import { DomainError } from '@domain/errors';
import { sanitizeHtml } from '@utils/sanitizer';

function requireMessageContent(value: unknown): string {
  if (typeof value !== 'string' || !value.trim()) throw new DomainError('content is required.');
  const trimmed = value.trim();
  if (trimmed.length > 5_000) throw new DomainError('content is too long.');
  return trimmed;
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await requireSessionUser();
    const services = await getServerServices();

    const ticketResult = await services.support.getTicket({
      ticketId: id,
      userId: user.role === 'admin' ? undefined : user.id,
    });
    if (!ticketResult.ok) {
      return supportRouteResponse(ticketResult);
    }

    const data = await readJsonObject(req);
    const isAdmin = user.role === 'admin';
    const requestedVisibility: 'internal' | 'public' = data.visibility === 'internal' ? 'internal' : 'public';
    const content = await sanitizeHtml(requireMessageContent(data.content));

    const result = await services.support.addTicketMessage({
      actor: { id: user.id, email: user.email, name: user.displayName },
      source: isAdmin ? 'admin' : 'customer',
      idempotencyKey: optionalString(data.idempotencyKey, 'idempotencyKey') ?? `ticket.message:${id}:${user.id}:${content.slice(0, 32)}`,
      ticketId: id,
      content,
      visibility: isAdmin ? requestedVisibility : 'public',
      senderType: isAdmin ? 'agent' : 'customer',
    });

    return supportRouteResponse(result);
  } catch (err) {
    return jsonError(err, 'Failed to add support message');
  }
}
