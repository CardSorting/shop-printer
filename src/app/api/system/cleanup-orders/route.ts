import { NextResponse } from 'next/server';
import { getServerServices } from '@infrastructure/server/services';
import { checkoutRouteResponse } from '@infrastructure/server/checkoutRouteAdapter';
import { inventoryRouteResponse } from '@infrastructure/server/inventoryRouteAdapter';
import { logger } from '@utils/logger';
import { jsonError, requireConfiguredBearerToken } from '@infrastructure/server/apiGuards';

/**
 * [LAYER: SYSTEM]
 * Background job for cleaning up expired pending orders and inventory reservations.
 */
export async function POST(request: Request) {
  try {
    requireConfiguredBearerToken(request, 'SYSTEM_JOB_TOKEN');
    const services = await getServerServices();

    const [checkoutResult, inventoryResult] = await Promise.all([
      services.checkout.cleanupExpiredPendingOrders({ maxAgeMinutes: 60 }),
      services.inventory.cleanupExpiredReservations({ limit: 100 }),
    ]);

    if (!checkoutResult.ok) {
      return checkoutRouteResponse(checkoutResult);
    }
    if (!inventoryResult.ok) {
      return inventoryRouteResponse(inventoryResult);
    }

    const payload = {
      success: true,
      checkout: checkoutResult.data,
      inventory: inventoryResult.data,
      timestamp: new Date().toISOString(),
    };

    logger.info('system_cleanup_completed', {
      checkoutScanned: checkoutResult.data.scanned,
      checkoutCancelled: checkoutResult.data.cancelled,
      checkoutFailed: checkoutResult.data.failed,
      inventoryScanned: inventoryResult.data.scanned,
      inventoryReleased: inventoryResult.data.released,
      inventoryFailed: inventoryResult.data.failed,
    });

    const partial =
      checkoutResult.data.failed > 0
      || checkoutResult.data.errors.length > 0
      || inventoryResult.data.failed > 0
      || inventoryResult.data.errors.length > 0;

    return NextResponse.json(payload, { status: partial ? 207 : 200 });
  } catch (error) {
    return jsonError(error, 'System cleanup failed');
  }
}
