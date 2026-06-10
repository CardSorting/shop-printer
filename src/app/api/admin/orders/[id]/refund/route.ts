import { NextResponse } from 'next/server';
import { getServerServices } from '@infrastructure/server/services';
import { adminRouteResponse } from '@infrastructure/server/adminRouteAdapter';
import { toAdminActor } from '@infrastructure/server/adminActor';
import {
    jsonError,
    optionalInteger,
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
        const services = await getServerServices();
        const actor = toAdminActor(user, { elevated: true });

        const orderResult = await services.admin.getAdminOrder({ actor, orderId: id });
        if (!orderResult.ok) return adminRouteResponse(orderResult);
        const order = orderResult.data;

        const refundableBalance = Math.max(0, order.total - (order.refundedAmount || 0));
        if (refundableBalance <= 0) throw new DomainError('This order has no refundable balance remaining.');

        const amount = optionalInteger(body.amount, 'amount') ?? refundableBalance;
        if (amount <= 0) throw new DomainError('amount must be a positive whole number of cents.');
        if (amount > refundableBalance) {
            throw new DomainError('Refund amount exceeds the remaining refundable balance.');
        }

        const reason = requireString(body.reason, 'reason');
        const idempotencyKey = requireString(
            body.idempotencyKey ?? body.refundAttemptId,
            'idempotencyKey',
        );

        const result = await services.admin.requestRefund({
            actor,
            orderId: id,
            amount,
            reason,
            idempotencyKey,
        });

        if (!result.ok) {
            return adminRouteResponse(result);
        }

        return NextResponse.json({
            ok: true,
            amount: result.data.amount,
            status: result.data.status,
            stripeRefundId: result.data.stripeRefundId,
            duplicate: result.duplicate ?? false,
        });
    } catch (error) {
        return jsonError(error, 'Failed to process refund');
    }
}
