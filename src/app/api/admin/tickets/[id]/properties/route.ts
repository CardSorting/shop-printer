import { requireAdminSession, jsonError, readJsonObject, requireString, optionalString } from '@infrastructure/server/apiGuards';
import { getServerServices } from '@infrastructure/server/services';
import { supportRouteResponse } from '@infrastructure/server/supportRouteAdapter';
import { parseTicketProperties } from '../../parsers';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAdminSession(req);
    const body = await readJsonObject(req);
    const properties = parseTicketProperties(body);
    const { id: rawId } = await params;
    const id = requireString(rawId, 'id');

    const services = await getServerServices();
    const result = await services.support.updateTicket({
      actor: { id: session.id, email: session.email, name: session.displayName },
      source: 'admin',
      idempotencyKey: optionalString(body.idempotencyKey, 'idempotencyKey') ?? `ticket.properties:${id}`,
      ticketId: id,
      patch: properties,
      reason: optionalString(body.reason, 'reason'),
    });

    return supportRouteResponse(result);
  } catch (err) {
    return jsonError(err);
  }
}
