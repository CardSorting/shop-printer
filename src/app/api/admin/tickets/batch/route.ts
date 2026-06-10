import { requireAdminSession, jsonError, readJsonObject, optionalString } from '@infrastructure/server/apiGuards';
import { getServerServices } from '@infrastructure/server/services';
import { supportRouteResponse } from '@infrastructure/server/supportRouteAdapter';
import { parseTicketBatchUpdate } from '../parsers';

export async function PATCH(request: Request) {
  try {
    const session = await requireAdminSession(request);
    const body = await readJsonObject(request);
    const { ids, updates } = parseTicketBatchUpdate(body);

    const services = await getServerServices();
    const result = await services.support.batchUpdateTickets({
      actor: { id: session.id, email: session.email, name: session.displayName },
      source: 'admin',
      idempotencyKey: optionalString(body.idempotencyKey, 'idempotencyKey') ?? `ticket.batch:${ids.join(',')}`,
      ticketIds: ids,
      patch: updates,
      reason: optionalString(body.reason, 'reason'),
    });

    return supportRouteResponse(result);
  } catch (err) {
    return jsonError(err, 'Failed to batch update tickets');
  }
}
