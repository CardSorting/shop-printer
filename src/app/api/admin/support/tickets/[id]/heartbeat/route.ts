import { requireAdminSession, jsonError, readJsonObject, requireString } from '@infrastructure/server/apiGuards';
import { getServerServices } from '@infrastructure/server/services';
import { supportRouteResponse } from '@infrastructure/server/supportRouteAdapter';
import { parseTicketHeartbeat } from '../../../../tickets/parsers';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdminSession(request);
    const { id: rawTicketId } = await params;
    const ticketId = requireString(rawTicketId, 'id');
    const { userId, userName } = parseTicketHeartbeat(await readJsonObject(request));

    const services = await getServerServices();
    const result = await services.support.markHeartbeat({ ticketId, userId, userName });
    return supportRouteResponse(result);
  } catch (err) {
    return jsonError(err);
  }
}
