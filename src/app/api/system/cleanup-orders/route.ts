import { getServerServices } from '@infrastructure/server/services';
import { checkoutPartialReportResponse, checkoutRouteResponse } from '@infrastructure/server/checkoutRouteAdapter';
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
      const payload = {
        success: true,
        report: result.data,
        timestamp: new Date().toISOString(),
      };
      logger.info('checkout_cleanup_completed', {
        scanned: result.data.scanned,
        cancelled: result.data.cancelled,
        failed: result.data.failed,
        errorCount: result.data.errors.length,
        orderIds: result.data.errors.map((e) => e.orderId),
      });
      return checkoutPartialReportResponse({
        ok: true,
        data: payload,
      });
    }

    return checkoutRouteResponse(result);
  } catch (error) {
    return jsonError(error, 'System cleanup failed');
  }
}
