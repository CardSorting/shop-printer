import { getServerServices } from '@infrastructure/server/services';
import { checkoutRouteResponse } from '@infrastructure/server/checkoutRouteAdapter';
import { logger } from '@utils/logger';
import { jsonError, requireConfiguredBearerToken } from '@infrastructure/server/apiGuards';

/**
 * [LAYER: SYSTEM]
 * Background Job for Cleaning up Expired Pending Orders
 * This prevents inventory leakage from abandoned checkouts.
 */
export async function POST(request: Request) {
  try {
    requireConfiguredBearerToken(request, 'SYSTEM_JOB_TOKEN');
    const services = await getServerServices();
    const result = await services.checkout.cleanupExpiredPendingOrders({ maxAgeMinutes: 60 });

    if (result.ok) {
      logger.info('checkout_cleanup_completed', result.data);
      return checkoutRouteResponse({
        ok: true,
        data: {
          success: true,
          report: result.data,
          timestamp: new Date().toISOString(),
        },
      });
    }

    return checkoutRouteResponse(result);
  } catch (error) {
    return jsonError(error, 'System cleanup failed');
  }
}
