import { getServerServices } from '@infrastructure/server/services';
import { assertRateLimit, jsonError, readJsonObject, requireSessionUser, requireString } from '@infrastructure/server/apiGuards';
import { DomainError } from '@domain/errors';
import { calculateCartTotal } from '@domain/rules';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const user = await requireSessionUser(request);
        await assertRateLimit(request, 'discount:validate', 30, 60_000, user.id);

        const body = await readJsonObject(request);
        const code = requireString(body.code, 'code');

        const services = await getServerServices();
        const cart = await services.cartService.getCart(user.id);
        if (!cart || cart.items.length === 0) {
            throw new DomainError('Your cart is empty.');
        }

        const productIds = Array.from(new Set(cart.items.map((item) => item.productId)));
        const productEntries = await Promise.all(productIds.map(async (productId) => {
            const product = await services.productRepo.getById(productId);
            return [productId, product] as const;
        }));
        const productMap = new Map(productEntries);
        const lineItems = cart.items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.priceSnapshot,
            subtotal: item.priceSnapshot * item.quantity,
            collections: productMap.get(item.productId)?.collections ?? [],
        }));

        const result = await services.discountService.validateDiscount(code, calculateCartTotal(cart.items), user.id, undefined, [], { lineItems });

        return NextResponse.json(result);
    } catch (error) {
        return jsonError(error, 'Failed to validate discount');
    }
}
