import { getServerServices } from '@infrastructure/server/services';
import { checkoutRouteResponse } from '@infrastructure/server/checkoutRouteAdapter';
import {
  assertRateLimit,
  jsonError,
  readJsonObject,
  requireSessionUser,
  requireString,
} from '@infrastructure/server/apiGuards';
import { logger } from '@utils/logger';

/**
 * [LAYER: INTERFACE]
 * State-changing payment recovery uses POST so browser prefetchers, crawlers,
 * and cross-site links cannot trigger order finalization through a GET.
 */
export async function POST(request: Request) {
  try {
    const user = await requireSessionUser(request);
    await assertRateLimit(request, 'checkout_verify', 30, 60_000, user.id);
    const body = await readJsonObject(request);
    const paymentIntentId = requireString(body.paymentIntentId, 'paymentIntentId');

    const services = await getServerServices();
    const result = await services.checkout.recoverPendingOrder({
      userId: user.id,
      paymentIntentId,
    });

    return checkoutRouteResponse(result);
  } catch (error) {
    logger.error('Checkout verification failed', error);
    return jsonError(error, 'Verification failed', request);
  }
}
