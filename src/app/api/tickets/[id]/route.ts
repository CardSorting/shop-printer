import { getServerServices } from '@infrastructure/server/services';
import { supportRouteResponse } from '@infrastructure/server/supportRouteAdapter';
import { jsonError, requireSessionUser } from '@infrastructure/server/apiGuards';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await requireSessionUser();
    const services = await getServerServices();
    const result = await services.support.getTicket({
      ticketId: id,
      userId: user.role === 'admin' ? undefined : user.id,
    });
    return supportRouteResponse(result);
  } catch (err) {
    return jsonError(err, 'Failed to load support ticket');
  }
}
