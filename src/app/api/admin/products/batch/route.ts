import { NextResponse } from 'next/server';
import { DomainError } from '@domain/errors';
import { getServerServices } from '@infrastructure/server/services';
import { adminRouteResponse } from '@infrastructure/server/adminRouteAdapter';
import { toAdminActor } from '@infrastructure/server/adminActor';
import { jsonError, parseProductUpdate, readJsonObject, requireAdminSession, requireString } from '@infrastructure/server/apiGuards';

const MAX_BATCH_PRODUCTS = 100;

export async function POST(request: Request) {
    try {
        const user = await requireAdminSession(request);
        const body = await readJsonObject(request);
        const { updates } = body;

        if (!Array.isArray(updates)) throw new DomainError('Updates must be an array');
        if (updates.length === 0) throw new DomainError('Updates must not be empty');
        if (updates.length > MAX_BATCH_PRODUCTS) throw new DomainError(`Cannot update more than ${MAX_BATCH_PRODUCTS} products at once`);

        const validatedUpdates = updates.map((u: any, i: number) => ({
            id: requireString(u.id, `updates[${i}].id`),
            updates: parseProductUpdate(u.updates || {})
        }));

        const services = await getServerServices();
        const result = await services.admin.batchUpdateProducts({
            actor: toAdminActor(user),
            updates: validatedUpdates,
            idempotencyKey: typeof body.idempotencyKey === 'string' ? body.idempotencyKey : undefined,
        });

        return adminRouteResponse(result);
    } catch (error) {
        return jsonError(error, 'Failed to perform batch update');
    }
}

export async function DELETE(request: Request) {
    try {
        const user = await requireAdminSession(request);
        const body = await readJsonObject(request);
        const { ids } = body;

        if (!Array.isArray(ids)) throw new DomainError('IDs must be an array');
        if (ids.length === 0) throw new DomainError('IDs must not be empty');
        if (ids.length > MAX_BATCH_PRODUCTS) throw new DomainError(`Cannot delete more than ${MAX_BATCH_PRODUCTS} products at once`);

        const validatedIds = ids.map((id, i) => requireString(id, `ids[${i}]`));

        const services = await getServerServices();
        const result = await services.admin.batchArchiveProducts({
            actor: toAdminActor(user),
            productIds: validatedIds,
            reason: typeof body.reason === 'string' ? body.reason : 'Batch product archive',
            idempotencyKey: typeof body.idempotencyKey === 'string' ? body.idempotencyKey : undefined,
        });

        if (!result.ok) {
            return adminRouteResponse(result);
        }

        return NextResponse.json({ success: true, duplicate: result.duplicate ?? false });
    } catch (error) {
        return jsonError(error, 'Failed to perform batch deletion');
    }
}
