import { getServerServices } from '@infrastructure/server/services';
import { inventoryPartialReportResponse, inventoryRouteResponse } from '@infrastructure/server/inventoryRouteAdapter';
import { logger } from '@utils/logger';
import { jsonError, requireConfiguredBearerToken } from '@infrastructure/server/apiGuards';

/**
 * [LAYER: SYSTEM]
 * Background job for releasing expired inventory reservations.
 */
export async function POST(request: Request) {
  try {
    requireConfiguredBearerToken(request, 'SYSTEM_JOB_TOKEN');
    const services = await getServerServices();
    const result = await services.inventory.cleanupExpiredReservations({ limit: 100 });

    if (result.ok) {
      logger.info('inventory_cleanup_completed', {
        scanned: result.data.scanned,
        expired: result.data.expired,
        released: result.data.released,
        failed: result.data.failed,
        errorCount: result.data.errors.length,
      });
      return inventoryPartialReportResponse({
        ok: true,
        data: {
          success: true,
          report: result.data,
          timestamp: new Date().toISOString(),
          failed: result.data.failed,
          errors: result.data.errors,
        },
      });
    }

    return inventoryRouteResponse(result);
  } catch (error) {
    return jsonError(error, 'Inventory cleanup failed');
  }
}
