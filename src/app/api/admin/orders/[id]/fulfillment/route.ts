import { getServerServices } from '@infrastructure/server/services';
import { adminRouteResponse } from '@infrastructure/server/adminRouteAdapter';
import { toAdminActor } from '@infrastructure/server/adminActor';
import {
    jsonError,
    optionalString,
    readJsonObject,
    requireAdminSession,
} from '@infrastructure/server/apiGuards';
import { DomainError } from '@domain/errors';

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await requireAdminSession(request);
        const { id } = await params;
        const body = await readJsonObject(request);
        const trackingNumber = optionalString(body.trackingNumber, 'trackingNumber');
        const shippingCarrier = optionalString(body.shippingCarrier, 'shippingCarrier');

        if (!trackingNumber && !shippingCarrier) {
            throw new DomainError('trackingNumber or shippingCarrier is required.');
        }

        const services = await getServerServices();
        const result = await services.admin.fulfillOrder({
            actor: toAdminActor(user),
            orderId: id,
            trackingNumber,
            shippingCarrier,
            idempotencyKey: typeof body.idempotencyKey === 'string' ? body.idempotencyKey : undefined,
        });
        return adminRouteResponse(result);
    } catch (error) {
        return jsonError(error, 'Failed to update fulfillment');
    }
}
