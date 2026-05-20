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

        if (ids.length > 100) {
            throw new DomainError('A maximum of 100 orders can be updated at once.');
        }

        const validatedIds = Array.from(new Set(ids.map((id, i) => requireString(id, `ids[${i}]`))));
        if (validatedIds.length === 0) {
            throw new DomainError('At least one order id is required.');
        }

        const services = await getServerServices();
        const result = await services.orderService.batchUpdateOrderStatus(
            validatedIds, 
            status, 
            { id: user.id, email: user.email }
        );

        return NextResponse.json({ success: true, updatedCount: result.updatedIds.length, updatedIds: result.updatedIds });
    } catch (error) {
        return jsonError(error, 'Failed to perform batch order update');
    }
}
