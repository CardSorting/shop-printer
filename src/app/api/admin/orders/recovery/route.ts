import { getServerServices } from '@infrastructure/server/services';
import { adminRouteResponse } from '@infrastructure/server/adminRouteAdapter';
import { toAdminActor } from '@infrastructure/server/adminActor';
import { jsonError, parseBoundedLimit, requireAdminSession } from '@infrastructure/server/apiGuards';

export async function GET(request: Request) {
  try {
    const user = await requireAdminSession(request);
    const { searchParams } = new URL(request.url);
    const services = await getServerServices();
    const result = await services.admin.getRecoveryReadModel({
      actor: toAdminActor(user),
      limit: parseBoundedLimit(searchParams.get('limit')),
    });
    return adminRouteResponse(result);
  } catch (error) {
    return jsonError(error, 'Failed to load order recovery state');
  }
}
