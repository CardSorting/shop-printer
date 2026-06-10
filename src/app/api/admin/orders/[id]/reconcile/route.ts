/**
 * [LAYER: API — ADMIN]
 * POST /api/admin/orders/[id]/reconcile
 */
import { getServerServices } from '@infrastructure/server/services';
import { adminRouteResponse } from '@infrastructure/server/adminRouteAdapter';
import { toAdminActor } from '@infrastructure/server/adminActor';
import {
    jsonError,
    parseOrderStatus,
    readJsonObject,
    requireStepUpAdminSession,
    requireString,
} from '@infrastructure/server/apiGuards';
import { DomainError } from '@domain/errors';

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await requireStepUpAdminSession(request);
        const { id } = await params;
        const body = await readJsonObject(request);

        const resolutionAction = parseOrderStatus(body.resolutionAction);
        if (!resolutionAction) throw new DomainError('resolutionAction is required.');

        const reason = requireString(body.reason, 'reason');
        const evidence = requireString(body.evidence, 'evidence');

        const ALLOWED_RESOLUTION_STATUSES = new Set([
            'confirmed', 'processing', 'shipped', 'delivered',
            'cancelled', 'refunded', 'partially_refunded'
        ]);
        if (!ALLOWED_RESOLUTION_STATUSES.has(resolutionAction)) {
            throw new DomainError(`Cannot resolve to status: ${resolutionAction}. Must be a stable terminal state.`);
        }

        const services = await getServerServices();
        const result = await services.admin.reconcileOrder({
            actor: toAdminActor(user, { elevated: true }),
            orderId: id,
            resolutionAction,
            reason,
            evidence,
            idempotencyKey: typeof body.idempotencyKey === 'string' ? body.idempotencyKey : undefined,
        });

        if (!result.ok) {
            return adminRouteResponse(result);
        }

        return NextResponse.json({
            ok: true,
            message: `Order ${id} reconciliation resolved as '${resolutionAction}' by ${user.email}.`,
            duplicate: result.duplicate ?? false,
        });
    } catch (error) {
        return jsonError(error, 'Failed to resolve order reconciliation');
    }
}
