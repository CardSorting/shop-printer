import { getServerServices } from '@infrastructure/server/services';
import { adminRouteResponse } from '@infrastructure/server/adminRouteAdapter';
import { toAdminActor } from '@infrastructure/server/adminActor';
import { jsonError, readJsonObject, requireAdminSession, requireString } from '@infrastructure/server/apiGuards';

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await requireAdminSession(request);
        const { id } = await params;
        const body = await readJsonObject(request);
        const text = requireString(body.text, 'text');

        const services = await getServerServices();
        const result = await services.admin.addOrderNote({
            actor: toAdminActor(user),
            orderId: id,
            text,
            idempotencyKey: typeof body.idempotencyKey === 'string' ? body.idempotencyKey : undefined,
        });
        return adminRouteResponse(result);
    } catch (error) {
        return jsonError(error, 'Failed to add order note');
    }
}
