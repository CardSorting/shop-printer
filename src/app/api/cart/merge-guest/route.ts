import { getServerServices } from '@infrastructure/server/services';
import { cartRouteResponse } from '@infrastructure/server/cartRouteAdapter';
import {
  assertRateLimit,
  jsonError,
  readJsonObject,
  requireSessionUser,
} from '@infrastructure/server/apiGuards';
import { DomainError } from '@domain/errors';

type GuestMergeItem = {
  productId: string;
  quantity: number;
  variantId?: string;
};

function parseGuestMergeItems(body: Record<string, unknown>): GuestMergeItem[] {
  const raw = body.items;
  if (!Array.isArray(raw) || raw.length === 0) {
    throw new DomainError('Guest cart items are required.');
  }
  return raw.map((entry, index) => {
    if (!entry || typeof entry !== 'object') {
      throw new DomainError(`Invalid guest item at index ${index}.`);
    }
    const item = entry as Record<string, unknown>;
    const productId = typeof item.productId === 'string' ? item.productId.trim() : '';
    const quantity = Number(item.quantity);
    const variantId = typeof item.variantId === 'string' ? item.variantId : undefined;
    if (!productId || !Number.isInteger(quantity) || quantity <= 0 || quantity > 99) {
      throw new DomainError(`Invalid guest item at index ${index}.`);
    }
    return { productId, quantity, variantId };
  });
}

export async function POST(request: Request) {
  try {
    const user = await requireSessionUser();
    await assertRateLimit(request, 'cart:merge-guest', 10, 60_000);
    const body = await readJsonObject(request);
    const items = parseGuestMergeItems(body);
    const services = await getServerServices();
    return cartRouteResponse(
      await services.cart.mergeGuestItems({ userId: user.id, items }),
    );
  } catch (error) {
    return jsonError(error, 'Failed to merge guest cart');
  }
}
