import { getServerServices } from '@infrastructure/server/services';
import { supportRouteResponse } from '@infrastructure/server/supportRouteAdapter';
import { jsonError, requireAdminSession, requireString } from '@infrastructure/server/apiGuards';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdminSession(req);
    const { id: rawId } = await params;
    const id = requireString(rawId, 'id');
    const services = await getServerServices();
    const result = await services.support.getTicket({ ticketId: id });
    return supportRouteResponse(result);
  } catch (err: any) {
    return jsonError(err, 'Failed to fetch ticket');
  }
}
