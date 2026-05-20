import { NextResponse } from 'next/server';
import { getServerServices } from '@infrastructure/server/services';
import { jsonError, optionalInteger, optionalString, parseOrderStatus, readJsonObject, requireAdminSession, requireStepUpAdminSession } from '@infrastructure/server/apiGuards';
import { DomainError, OrderNotFoundError } from '@domain/errors';
import type { User } from '@domain/models';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        await requireAdminSession(request);
        const { id } = await params;
        const services = await getServerServices();
        const order = await services.orderService.getOrder(id);
        if (!order) throw new OrderNotFoundError(id);
        return NextResponse.json(order);
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
        // Step-up auth for destructive actions
        if (parsedStatus === 'cancelled' || parsedStatus === 'refunded' || parsedStatus === 'partially_refunded') {
            user = await requireStepUpAdminSession(request);
        } else {
            user = await requireAdminSession(request);
        }

        const services = await getServerServices();
        if (parsedStatus === 'refunded' || parsedStatus === 'partially_refunded') {
            const order = await services.orderService.getAdminOrder(id);
            if (!order) throw new OrderNotFoundError(id);
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

            const refundAttemptId = optionalString(body.refundAttemptId, 'refundAttemptId')
                || `admin-status-${parsedStatus}-${id}-${amount}`;
            await services.refundService.processRefund(id, amount, { id: user.id, email: user.email }, refundAttemptId);
        } else {
            await services.orderService.updateOrderStatus(id, parsedStatus, { id: user.id, email: user.email });
        }
        return NextResponse.json({ ok: true });
    } catch (error) {
        return jsonError(error, 'Failed to update order status');
    }
}
