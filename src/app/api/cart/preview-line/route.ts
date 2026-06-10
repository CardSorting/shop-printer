import { getServerServices } from '@infrastructure/server/services';
import { cartRouteResponse } from '@infrastructure/server/cartRouteAdapter';
import { assertRateLimit, jsonError, parseCartItemMutation, readJsonObject } from '@infrastructure/server/apiGuards';
import { DomainError } from '@domain/errors';

/** Guest snapshot builder — purchase intent preview, no persistence. */
export async function POST(request: Request) {
  try {
    await assertRateLimit(request, 'cart:preview', 60, 60_000);
    const { productId, quantity, variantId } = parseCartItemMutation(await readJsonObject(request));
    if (quantity <= 0 || quantity > 99) throw new DomainError('Quantity must be between 1 and 99.');
    const services = await getServerServices();
    return cartRouteResponse(
      await services.cart.previewLineItem({ productId, quantity, variantId }),
    );
  } catch (error) {
    return jsonError(error, 'Failed to preview cart line');
  }
}
