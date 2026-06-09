import { DomainError } from '@domain/errors';
import { getServerServices } from '@infrastructure/server/services';
import { inventoryRouteResponse } from '@infrastructure/server/inventoryRouteAdapter';
import { jsonError, requireAdminSession } from '@infrastructure/server/apiGuards';

/**
 * [LAYER: API]
 * Read-only inventory ledger for a product (audit trail).
 */
export async function GET(request: Request) {
  try {
    await requireAdminSession(request);
    const services = await getServerServices();

    const url = new URL(request.url);
    const productId = url.searchParams.get('productId')?.trim();
    if (!productId) throw new DomainError('productId query parameter is required');

    const limitParam = url.searchParams.get('limit');
    const limit = limitParam ? Number.parseInt(limitParam, 10) : undefined;
    if (limit !== undefined && (!Number.isInteger(limit) || limit <= 0 || limit > 500)) {
      throw new DomainError('limit must be an integer between 1 and 500');
    }

    const result = await services.inventory.getProductLedger({ productId, limit });
    return inventoryRouteResponse(result);
  } catch (err) {
    console.error('[API] Inventory Ledger Read Failed:', err);
    return jsonError(err, 'Failed to load inventory ledger');
  }
}
