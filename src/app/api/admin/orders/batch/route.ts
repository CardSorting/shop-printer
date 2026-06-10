import { getServerServices } from '@infrastructure/server/services';
import { adminRouteResponse } from '@infrastructure/server/adminRouteAdapter';
import { toAdminActor } from '@infrastructure/server/adminActor';
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
        const result = await services.admin.batchUpdateOrderStatus({
            actor: toAdminActor(user, { elevated: status === 'cancelled' }),
            orderIds: validatedIds,
            status,
            reason: typeof body.reason === 'string' ? body.reason : undefined,
            idempotencyKey: typeof body.idempotencyKey === 'string' ? body.idempotencyKey : undefined,
        });

        if (!result.ok) {
            return adminRouteResponse(result);
        }

        return adminRouteResponse({
            ok: true,
            data: {
                success: true,
                updatedCount: result.data.updatedIds.length,
                updatedIds: result.data.updatedIds,
                duplicate: result.duplicate ?? false,
            },
        });
    } catch (error) {
        return jsonError(error, 'Failed to perform batch order update');
    }
}
