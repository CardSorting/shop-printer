import { getServerServices } from '@infrastructure/server/services';
import { adminRouteResponse } from '@infrastructure/server/adminRouteAdapter';
import { toAdminActor } from '@infrastructure/server/adminActor';
import { jsonError, parseBoundedLimit, parseOrderStatus, requireAdminSession } from '@infrastructure/server/apiGuards';

export async function GET(request: Request) {
    try {
        const user = await requireAdminSession(request);
        const { searchParams } = new URL(request.url);
        const services = await getServerServices();

        const result = await services.admin.listOrders({
            actor: toAdminActor(user),
            overview: searchParams.get('overview') === 'true',
            status: parseOrderStatus(searchParams.get('status')),
            limit: parseBoundedLimit(searchParams.get('limit')),
            cursor: searchParams.get('cursor') ?? undefined,
        });

        return adminRouteResponse(result);
    } catch (error) {
        return jsonError(error, 'Failed to load admin orders');
    }
}
