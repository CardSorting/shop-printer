import { NextResponse } from 'next/server';
import { getServerServices } from '@infrastructure/server/services';
import { jsonError, requireAdminSession } from '@infrastructure/server/apiGuards';

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await requireAdminSession(request);
        const { id } = await params;
        const services = await getServerServices();
        await services.shippingService.deleteZone(id, { id: user.id, email: user.email });
        return NextResponse.json({ ok: true });
    } catch (error) {
        return jsonError(error, 'Failed to delete shipping zone');
    }
}
