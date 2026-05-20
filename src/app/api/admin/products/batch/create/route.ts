import { NextResponse } from 'next/server';
import { DomainError } from '@domain/errors';
import { getServerServices } from '@infrastructure/server/services';
import {
    jsonError,
    parseProductDraft,
    readJsonObject,
    requireAdminSession,
} from '@infrastructure/server/apiGuards';

const MAX_BATCH_PRODUCTS = 100;

export async function POST(request: Request) {
    try {
        const user = await requireAdminSession(request);
        const body = await readJsonObject(request);
        const { products } = body;

        if (!Array.isArray(products)) throw new DomainError('products must be an array');
        if (products.length === 0) throw new DomainError('products must not be empty');
        if (products.length > MAX_BATCH_PRODUCTS) {
            throw new DomainError(`Cannot create more than ${MAX_BATCH_PRODUCTS} products at once`);
        }

        const drafts = products.map((product, index) => {
            if (!product || typeof product !== 'object' || Array.isArray(product)) {
                throw new DomainError(`products[${index}] must be an object`);
            }
            return parseProductDraft(product as Record<string, unknown>);
        });

        const services = await getServerServices();
        const created = await services.productService.batchCreateProducts(
            drafts,
            { id: user.id, email: user.email }
        );

        return NextResponse.json(created, { status: 201 });
    } catch (error) {
        return jsonError(error, 'Failed to perform batch product creation', request);
    }
}
