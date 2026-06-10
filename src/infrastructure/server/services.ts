/**
 * [LAYER: INFRASTRUCTURE]
 * Server-side service initialization.
 */
import { getInitialServices } from '@core/container';
import type { AdminApplicationService } from '@core/admin/adminApplicationService';
import type { CheckoutApplicationService } from '@core/order/checkoutApplicationService';
import type { InventoryApplicationService } from '@core/inventory/inventoryApplicationService';

import type { RefundApplicationService } from '@core/refund/refundApplicationService';

export type ServerServices = ReturnType<typeof getInitialServices> & {
  checkout: CheckoutApplicationService;
  inventory: InventoryApplicationService;
  admin: AdminApplicationService;
  refunds: RefundApplicationService;
};

export async function getServerServices(): Promise<ServerServices> {
    return getInitialServices();
}
