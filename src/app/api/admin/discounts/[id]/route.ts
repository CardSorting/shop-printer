import { NextResponse } from 'next/server';
import { getServerServices } from '@infrastructure/server/services';
import { jsonError, readJsonObject, requireAdminSession, requireString } from '@infrastructure/server/apiGuards';
import { parseDiscountUpdate } from '../parsers';

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await requireAdminSession(request);
        const { id: rawId } = await params;
        const id = requireString(rawId, 'id');
        const services = await getServerServices();
        await services.discountService.deleteDiscount(id, { id: user.id, email: user.email });
        return NextResponse.json({ success: true, deletedId: id });
    } catch (error) {
        return jsonError(error, 'Failed to delete discount');
    }
}

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await requireAdminSession(request);
        const { id: rawId } = await params;
        const id = requireString(rawId, 'id');
        const data = parseDiscountUpdate(await readJsonObject(request));
        const services = await getServerServices();

        const updated = await services.discountService.updateDiscount(id, data, { id: user.id, email: user.email });
        return NextResponse.json(updated);
    } catch (error) {
        return jsonError(error, 'Failed to update discount');
    }
}
