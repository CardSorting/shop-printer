import { getServerServices } from '@infrastructure/server/services';
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
    const { count } = await services.checkout.cleanupExpiredPendingOrders(60, services.stripeService);

    logger.info(`System cleanup: Processed ${count} expired orders.`);

    return Response.json({
      success: true,
      processed: count,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return jsonError(error, 'System cleanup failed');
  }
}
