import { getServerServices } from '@infrastructure/server/services';
import { supportRouteResponse } from '@infrastructure/server/supportRouteAdapter';
import { jsonError, requireAdminSession, requireString } from '@infrastructure/server/apiGuards';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    await requireAdminSession(request);
    const { userId: rawUserId } = await params;
    const userId = requireString(rawUserId, 'userId');
    const services = await getServerServices();
    const result = await services.support.getCustomerSupportSummary(userId);
    return supportRouteResponse(result);
  } catch (err) {
    return jsonError(err, 'Failed to fetch customer summary');
  }
}
