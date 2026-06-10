import { getServerServices } from '@infrastructure/server/services';
import { crmRouteResponse } from '@infrastructure/server/crmRouteAdapter';
import { toAdminActor } from '@infrastructure/server/adminActor';
import { jsonError, requireAdminSession } from '@infrastructure/server/apiGuards';

async function getCustomerSummariesResponse(request: Request) {
    const user = await requireAdminSession(request);
    const services = await getServerServices();
    const result = await services.crm.listCustomers({ actor: toAdminActor(user) });
    return crmRouteResponse(result);
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
