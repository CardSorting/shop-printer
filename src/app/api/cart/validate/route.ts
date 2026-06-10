import { getServerServices } from '@infrastructure/server/services';
import { cartRouteResponse } from '@infrastructure/server/cartRouteAdapter';
import { jsonError, requireSessionUser } from '@infrastructure/server/apiGuards';

export async function POST() {
  try {
    const user = await requireSessionUser();
    const services = await getServerServices();
    return cartRouteResponse(await services.cart.validateCart({ userId: user.id }));
  } catch (error) {
    return jsonError(error, 'Failed to validate cart');
  }
}
