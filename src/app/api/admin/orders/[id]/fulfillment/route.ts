import { NextResponse } from 'next/server';
import { getServerServices } from '@infrastructure/server/services';
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
        await services.orderService.updateOrderFulfillment(
            id,
            { trackingNumber, shippingCarrier },
            { id: user.id, email: user.email }
        );
        return NextResponse.json({ ok: true });
    } catch (error) {
        return jsonError(error, 'Failed to update fulfillment');
    }
}
