import { getServerServices } from '@infrastructure/server/services';
import { checkoutRouteResponse } from '@infrastructure/server/checkoutRouteAdapter';
import { jsonError, requireSessionUser, requireString } from '@infrastructure/server/apiGuards';
import { logger } from '@utils/logger';

/**
 * [LAYER: INTERFACE]
 * Success-Page Verification Route (Speed-of-Light UI Feedback)
 */
export async function GET(request: Request) {
  try {
    const user = await requireSessionUser();
    const { searchParams } = new URL(request.url);
    const paymentIntentId = requireString(searchParams.get('payment_intent'), 'payment_intent');

    const services = await getServerServices();
    const result = await services.checkout.recoverPendingOrder({
      userId: user.id,
      paymentIntentId,
    });

    return checkoutRouteResponse(result);
  } catch (error) {
    logger.error('Checkout verification failed', error);
    return jsonError(error, 'Verification failed');
  }
}
