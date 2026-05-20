import { NextResponse } from 'next/server';
import { getServerServices } from '@infrastructure/server/services';
import {
    jsonError,
    optionalInteger,
    optionalString,
    readJsonObject,
    requireStepUpAdminSession,
} from '@infrastructure/server/apiGuards';
import { DomainError, OrderNotFoundError } from '@domain/errors';

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await requireStepUpAdminSession(request);
        const { id } = await params;
        const body = await readJsonObject(request);
        const services = await getServerServices();
        const order = await services.orderService.getAdminOrder(id);
        if (!order) throw new OrderNotFoundError(id);

        const refundableBalance = Math.max(0, order.total - (order.refundedAmount || 0));
        if (refundableBalance <= 0) throw new DomainError('This order has no refundable balance remaining.');

        const amount = optionalInteger(body.amount, 'amount') ?? refundableBalance;
        if (amount <= 0) throw new DomainError('amount must be a positive whole number of cents.');
        if (amount > refundableBalance) {
            throw new DomainError('Refund amount exceeds the remaining refundable balance.');
        }

        const refundAttemptId = optionalString(body.refundAttemptId, 'refundAttemptId');
        if (!refundAttemptId) throw new DomainError('refundAttemptId is required.');

        await services.refundService.processRefund(
            id,
            amount,
            { id: user.id, email: user.email },
            refundAttemptId
        );
        return NextResponse.json({
            ok: true,
            amount,
            status: amount === refundableBalance ? 'refunded' : 'partially_refunded',
        });
    } catch (error) {
        return jsonError(error, 'Failed to process refund');
    }
}
