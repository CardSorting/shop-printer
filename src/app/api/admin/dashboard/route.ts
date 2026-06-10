import { getServerServices } from '@infrastructure/server/services';
import { adminRouteResponse } from '@infrastructure/server/adminRouteAdapter';
import { toAdminActor } from '@infrastructure/server/adminActor';
import { jsonError, requireAdminSession } from '@infrastructure/server/apiGuards';

export async function GET(req: Request) {
    try {
        const user = await requireAdminSession(req);
        const services = await getServerServices();
        const result = await services.admin.listDashboard({ actor: toAdminActor(user) });
        return adminRouteResponse(result);
    } catch (error) {
        return jsonError(error, 'Failed to load admin dashboard');
    }
}
