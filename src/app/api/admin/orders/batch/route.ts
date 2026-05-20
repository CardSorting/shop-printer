import { NextResponse } from 'next/server';
import { getServerServices } from '@infrastructure/server/services';
import { DomainError } from '@domain/errors';
import { jsonError, readJsonObject, requireAdminSession, requireOrderStatus, requireStepUpAdminSession, requireString } from '@infrastructure/server/apiGuards';

export async function PATCH(request: Request) {
    try {
        const body = await readJsonObject(request);
        const { ids } = body;
        const status = requireOrderStatus(body.status);
        if (status === 'refunded' || status === 'partially_refunded') {
            throw new DomainError('Use the refund workflow for payment refunds; batch status updates cannot issue processor refunds.');
        }

        const user = status === 'cancelled'
            ? await requireStepUpAdminSession(request)
            : await requireAdminSession(request);

        if (!Array.isArray(ids)) {
            throw new Error('IDs must be an array');
        }

        const validatedIds = ids.map((id, i) => requireString(id, `ids[${i}]`));

        const services = await getServerServices();
        await services.orderService.batchUpdateOrderStatus(
            validatedIds, 
            status, 
            { id: user.id, email: user.email }
        );

        return NextResponse.json({ success: true });
    } catch (error) {
        return jsonError(error, 'Failed to perform batch order update');
    }
}
