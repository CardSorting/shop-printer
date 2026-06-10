import { getServerServices } from '@infrastructure/server/services';
import { supportRouteResponse } from '@infrastructure/server/supportRouteAdapter';
import { jsonError, requireAdminSession } from '@infrastructure/server/apiGuards';

export async function GET(request: Request) {
  try {
    await requireAdminSession(request);
    const services = await getServerServices();
    const result = await services.support.getTicketHealthMetrics();
    return supportRouteResponse(result);
  } catch (err) {
    return jsonError(err, 'Failed to fetch health metrics');
  }
}
