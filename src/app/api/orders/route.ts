import { NextResponse } from 'next/server';
import { getServerServices } from '@infrastructure/server/services';
import { jsonError, parseOrderStatus, requireSessionUser } from '@infrastructure/server/apiGuards';

export async function GET(request: Request) {
    try {
        const user = await requireSessionUser(request);
        const services = await getServerServices();
        const { searchParams } = new URL(request.url);
        const statusParam = searchParams.get('status');
        const query = searchParams.get('query') ?? undefined;
        const from = searchParams.get('from');
        const to = searchParams.get('to');
        const sort = searchParams.get('sort');

        const orders = await services.orderService.getOrdersForCustomerView(user.id, {
            status: statusParam === 'all' ? undefined : parseOrderStatus(statusParam),
            query,
            from: from ? new Date(from) : undefined,
            to: to ? new Date(to) : undefined,
            sort: sort === 'newest' || sort === 'oldest' || sort === 'total_desc' || sort === 'total_asc' || sort === 'status'
                ? sort
                : undefined,
        });

        return NextResponse.json(orders);
    } catch (error) {
        return jsonError(error, 'Failed to load orders');
    }
}
