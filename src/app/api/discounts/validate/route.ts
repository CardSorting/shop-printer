import { getServerServices } from '@infrastructure/server/services';
import { assertRateLimit, jsonError, readJsonObject, requireSessionUser, requireString } from '@infrastructure/server/apiGuards';
import { DomainError } from '@domain/errors';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const user = await requireSessionUser(request);
        await assertRateLimit(request, 'discount:validate', 30, 60_000, user.id);

        const body = await readJsonObject(request);
        const code = requireString(body.code, 'code');

        const services = await getServerServices();
        const cartResult = await services.cart.getCart({ userId: user.id });
        if (!cartResult.ok || cartResult.data.items.length === 0) {
            throw new DomainError('Your cart is empty.');
        }
        const cartItems = cartResult.data.items;

        const productIds = Array.from(new Set(cartItems.map((item) => item.productId)));
        const productEntries = await Promise.all(productIds.map(async (productId) => {
            const product = await services.productRepo.getById(productId);
            return [productId, product] as const;
        }));
        const productMap = new Map(productEntries);
        const lineItems = cartItems.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.priceSnapshot,
            subtotal: item.priceSnapshot * item.quantity,
            collections: productMap.get(item.productId)?.collections ?? [],
        }));

        const subtotal = cartItems.reduce((sum, item) => sum + item.priceSnapshot * item.quantity, 0);
        const result = await services.discountService.validateDiscount(code, subtotal, user.id, undefined, [], { lineItems });

        return NextResponse.json(result);
    } catch (error) {
        return jsonError(error, 'Failed to validate discount');
    }
}
