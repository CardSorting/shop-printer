import { getServerServices } from '@infrastructure/server/services';
import { cartRouteResponse } from '@infrastructure/server/cartRouteAdapter';
import { assertRateLimit, jsonError, readJsonObject, requireSessionUser } from '@infrastructure/server/apiGuards';

export async function POST(request: Request) {
  try {
    const user = await requireSessionUser();
    await assertRateLimit(request, 'cart:note', 30, 60_000);
    const payload = await readJsonObject(request);
    const note = String(payload.note ?? '');
    const services = await getServerServices();
    return cartRouteResponse(await services.cart.updateNote({ userId: user.id, note }));
  } catch (error) {
    return jsonError(error, 'Failed to update cart note');
  }
}
