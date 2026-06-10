import { getServerServices } from '@infrastructure/server/services';
import { supportRouteResponse } from '@infrastructure/server/supportRouteAdapter';
import { jsonError, requireAdminSession } from '@infrastructure/server/apiGuards';
import { parseTicketListOptions } from './parsers';

export async function GET(req: Request) {
  try {
    await requireAdminSession(req);
    const { searchParams } = new URL(req.url);
    const services = await getServerServices();
    const result = await services.support.listTickets(parseTicketListOptions(searchParams));
    return supportRouteResponse(result);
  } catch (err: any) {
    return jsonError(err, 'Failed to fetch tickets');
  }
}
