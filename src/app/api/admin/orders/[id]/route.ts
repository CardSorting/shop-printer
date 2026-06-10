import { NextResponse } from 'next/server';
import { getServerServices } from '@infrastructure/server/services';
import { adminRouteResponse } from '@infrastructure/server/adminRouteAdapter';
import { toAdminActor } from '@infrastructure/server/adminActor';
import { jsonError, optionalInteger, optionalString, parseOrderStatus, readJsonObject, requireAdminSession, requireStepUpAdminSession } from '@infrastructure/server/apiGuards';
import { DomainError } from '@domain/errors';
import type { User } from '@domain/models';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const user = await requireAdminSession(request);
        const { id } = await params;
        const services = await getServerServices();
        const result = await services.admin.getOrder({
            actor: toAdminActor(user),
            orderId: id,
        });
        return adminRouteResponse(result);
    } catch (error) {
        return jsonError(error, 'Failed to load order details');
    }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const body = await readJsonObject(request);
        const { status } = body;
        const parsedStatus = parseOrderStatus(status);
        if (!parsedStatus) throw new DomainError('status is required.');

        let user: User;
        const elevated = parsedStatus === 'cancelled' || parsedStatus === 'refunded' || parsedStatus === 'partially_refunded';
        if (elevated) {
            user = await requireStepUpAdminSession(request);
        } else {
            user = await requireAdminSession(request);
        }

        const services = await getServerServices();
        const actor = toAdminActor(user as User & { role: 'admin' }, { elevated });

        if (parsedStatus === 'refunded' || parsedStatus === 'partially_refunded') {
            const orderResult = await services.admin.getOrder({ actor, orderId: id });
            if (!orderResult.ok) return adminRouteResponse(orderResult);
            const order = orderResult.data;
            const refundableBalance = Math.max(0, order.total - (order.refundedAmount || 0));
            if (refundableBalance <= 0) throw new DomainError('This order has no refundable balance remaining.');

            const requestedAmount = optionalInteger(body.amount, 'amount');
            const amount = parsedStatus === 'refunded'
                ? refundableBalance
                : requestedAmount;
            if (!amount || amount <= 0) {
                throw new DomainError('amount is required for a partial refund.');
            }
            if (amount > refundableBalance) {
                throw new DomainError('Refund amount exceeds the remaining refundable balance.');
            }

            const reason = typeof body.reason === 'string' ? body.reason : '';
            if (!reason.trim()) {
                throw new DomainError('reason is required for refund status changes.');
            }

            const idempotencyKey = optionalString(body.idempotencyKey, 'idempotencyKey')
                || optionalString(body.refundAttemptId, 'refundAttemptId')
                || `admin-status-${parsedStatus}-${id}-${amount}`;

            const result = await services.admin.requestRefund({
                actor,
                orderId: id,
                amount,
                reason,
                idempotencyKey,
            });
            if (!result.ok) return adminRouteResponse(result);
        } else {
            const result = await services.admin.updateOrderStatus({
                actor,
                orderId: id,
                status: parsedStatus,
                reason: typeof body.reason === 'string' ? body.reason : undefined,
                idempotencyKey: typeof body.idempotencyKey === 'string' ? body.idempotencyKey : undefined,
            });
            if (!result.ok) return adminRouteResponse(result);
        }
        return NextResponse.json({ ok: true });
    } catch (error) {
        return jsonError(error, 'Failed to update order status');
    }
}
