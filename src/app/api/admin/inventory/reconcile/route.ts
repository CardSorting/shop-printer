import { NextResponse } from 'next/server';
import { getServerServices } from '@infrastructure/server/services';
import { inventoryRouteResponse } from '@infrastructure/server/inventoryRouteAdapter';
import { jsonError, requireAdminSession } from '@infrastructure/server/apiGuards';

/**
 * [LAYER: API]
 * Compare cached stock counts against ledger-derived balances and open reconciliation cases.
 */
export async function POST() {
  try {
    await requireAdminSession();
    const services = await getServerServices();
    const result = await services.inventory.reconcileInventory({ actor: 'admin' });
    return inventoryRouteResponse(result);
  } catch (error) {
    return jsonError(error, 'Inventory reconciliation failed');
  }
}
