import { requireAdminSession, jsonError, readJsonObject, requireString, optionalString } from '@infrastructure/server/apiGuards';
import { getServerServices } from '@infrastructure/server/services';
import { supportRouteResponse } from '@infrastructure/server/supportRouteAdapter';
import { parseTicketStatusUpdate } from '../../parsers';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAdminSession(req);
    const { id: rawId } = await params;
    const id = requireString(rawId, 'id');
    const body = await readJsonObject(req);
    const status = parseTicketStatusUpdate(body);

    const services = await getServerServices();
    const result = await services.support.updateTicket({
      actor: { id: session.id, email: session.email, name: session.displayName },
      source: 'admin',
      idempotencyKey: optionalString(body.idempotencyKey, 'idempotencyKey') ?? `ticket.status:${id}:${status}`,
      ticketId: id,
      patch: { status },
      reason: optionalString(body.reason, 'reason'),
    });

    return supportRouteResponse(result);
  } catch (err) {
    return jsonError(err);
  }
}
