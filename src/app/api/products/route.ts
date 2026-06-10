import { NextResponse } from 'next/server';
import { getServerServices } from '@infrastructure/server/services';
import { adminRouteResponse } from '@infrastructure/server/adminRouteAdapter';
import { toAdminActor } from '@infrastructure/server/adminActor';
import { jsonError, parseBoundedLimit, parseProductDraft, readJsonObject, requireAdminSession } from '@infrastructure/server/apiGuards';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const services = await getServerServices();
        const categoryParam = searchParams.get('category');
        const category = categoryParam ? (categoryParam.includes(',') ? categoryParam.split(',') : categoryParam) : undefined;
        const result = await services.productService.getProducts({
            category,
            collection: searchParams.get('collection') ?? undefined,
            query: searchParams.get('query') ?? undefined,
            limit: parseBoundedLimit(searchParams.get('limit')),
            cursor: searchParams.get('cursor') ?? undefined,
        });
        return NextResponse.json(result, {
            headers: {
                'Cache-Control': 'private, max-age=30, stale-while-revalidate=120',
            },
        });
    } catch (error) {
        console.error('[API Products] 500 Error:', error);
        return jsonError(error, 'Failed to load products');
    }
}

export async function POST(request: Request) {
    try {
        const user = await requireAdminSession();
        const body = await readJsonObject(request);
        const services = await getServerServices();
        const result = await services.admin.createProduct({
            actor: toAdminActor(user),
            draft: parseProductDraft(body),
            idempotencyKey: typeof body.idempotencyKey === 'string' ? body.idempotencyKey : undefined,
        });
        if (!result.ok) {
            return adminRouteResponse(result);
        }
        return NextResponse.json(result.data, { status: result.duplicate ? 200 : 201 });
    } catch (error) {
        return jsonError(error, 'Failed to create product');
    }
}
