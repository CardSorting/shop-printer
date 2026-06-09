/**
 * [LAYER: INFRASTRUCTURE]
 * Server-side service initialization.
 */
import { getInitialServices } from '@core/container';
import type { CheckoutApplicationService } from '@core/order/checkoutApplicationService';
import type { InventoryApplicationService } from '@core/inventory/inventoryApplicationService';

export type ServerServices = ReturnType<typeof getInitialServices> & {
  checkout: CheckoutApplicationService;
  inventory: InventoryApplicationService;
};

export async function getServerServices(): Promise<ServerServices> {
    return getInitialServices();
}
