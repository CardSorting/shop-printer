import { getServerServices } from '@infrastructure/server/services';
import { adminRouteResponse } from '@infrastructure/server/adminRouteAdapter';
import { toAdminActor } from '@infrastructure/server/adminActor';
import { jsonError, requireAdminSession } from '@infrastructure/server/apiGuards';

async function getCustomerSummariesResponse(request: Request) {
    const user = await requireAdminSession(request);
    const services = await getServerServices();
    const result = await services.admin.listUsers({ actor: toAdminActor(user) });
    return adminRouteResponse(result);
}

export async function GET(request: Request) {
    try {
        return await getCustomerSummariesResponse(request);
    } catch (error) {
        return jsonError(error, 'Failed to fetch customer summaries');
    }
}

export async function POST(request: Request) {
    try {
        return await getCustomerSummariesResponse(request);
    } catch (error) {
        return jsonError(error, 'Failed to fetch customer summaries');
    }
}
