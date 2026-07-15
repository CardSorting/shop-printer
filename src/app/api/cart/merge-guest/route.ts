import { getServerServices } from '@infrastructure/server/services';
import { cartRouteResponse } from '@infrastructure/server/cartRouteAdapter';
import {
  assertRateLimit,
  assertTrustedMutationOrigin,
  jsonError,
  parseGuestCartMergeItems,
  readJsonObject,
  requireSessionUser,
} from '@infrastructure/server/apiGuards';

export async function POST(request: Request) {
  try {
    assertTrustedMutationOrigin(request);
    const user = await requireSessionUser();
    await assertRateLimit(request, 'cart:merge-guest', 10, 60_000);
    const body = await readJsonObject(request);
    const items = parseGuestCartMergeItems(body);
    const services = await getServerServices();
    return cartRouteResponse(
      await services.cart.mergeGuestItems({ userId: user.id, items }),
    );
  } catch (error) {
    return jsonError(error, 'Failed to merge guest cart');
  }
}
