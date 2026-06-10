import { NextResponse } from 'next/server';
import { getServerServices } from '@infrastructure/server/services';
import { adminRouteResponse } from '@infrastructure/server/adminRouteAdapter';
import { toAdminActor } from '@infrastructure/server/adminActor';
import { assertTrustedMutationOrigin, jsonError, parseProductUpdate, readJsonObject, requireAdminSession } from '@infrastructure/server/apiGuards';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const services = await getServerServices();
        return NextResponse.json(await services.productService.getProduct(id));
    } catch (error) {
        return jsonError(error, 'Product not found');
    }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const user = await requireAdminSession();
        const { id } = await params;
        const body = await readJsonObject(request);
        const services = await getServerServices();
        const result = await services.admin.updateProduct({
            actor: toAdminActor(user),
            productId: id,
            patch: parseProductUpdate(body),
            idempotencyKey: typeof body.idempotencyKey === 'string' ? body.idempotencyKey : undefined,
        });
        return adminRouteResponse(result);
    } catch (error) {
        return jsonError(error, 'Failed to update product');
    }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        assertTrustedMutationOrigin(request);
        const user = await requireAdminSession();
        const { id } = await params;
        const body = await readJsonObject(request).catch(() => ({}));
        const services = await getServerServices();
        const result = await services.admin.archiveProduct({
            actor: toAdminActor(user),
            productId: id,
            reason: typeof body.reason === 'string' ? body.reason : 'Product archived by admin',
            idempotencyKey: typeof body.idempotencyKey === 'string' ? body.idempotencyKey : undefined,
        });
        if (!result.ok) {
            return adminRouteResponse(result);
        }
        return NextResponse.json({ ok: true, duplicate: result.duplicate ?? false });
    } catch (error) {
        return jsonError(error, 'Failed to delete product');
    }
}
