import { getServerServices } from '@infrastructure/server/services';
import { cartRouteResponse } from '@infrastructure/server/cartRouteAdapter';
import { assertTrustedMutationOrigin, jsonError, requireSessionUser } from '@infrastructure/server/apiGuards';

export async function GET() {
  try {
    const user = await requireSessionUser();
    const services = await getServerServices();
    return cartRouteResponse(await services.cart.getCart({ userId: user.id }));
  } catch (error) {
    return jsonError(error, 'Failed to load cart');
  }
}

export async function DELETE(request: Request) {
  try {
    assertTrustedMutationOrigin(request);
    const user = await requireSessionUser();
    const services = await getServerServices();
    return cartRouteResponse(await services.cart.clearCart({ userId: user.id }));
  } catch (error) {
    return jsonError(error, 'Failed to clear cart');
  }
}
