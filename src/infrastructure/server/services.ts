/**
 * [LAYER: INFRASTRUCTURE]
 * Server-side service initialization.
 */
import { getInitialServices } from '@core/container';
import { assertProductionReadiness } from './productionEnv';
import type { AdminApplicationService } from '@core/admin/adminApplicationService';
import type { CheckoutApplicationService } from '@core/order/checkoutApplicationService';
import type { InventoryApplicationService } from '@core/inventory/inventoryApplicationService';

import type { RefundApplicationService } from '@core/refund/refundApplicationService';
import type { SupportApplicationService } from '@core/support/supportApplicationService';
import type { CrmApplicationService } from '@core/crm/crmApplicationService';
import type { CommerceTimelineService } from '@core/commerce/commerceTimelineService';
import type { ICommerceEventBus } from '@core/commerce/commerceEventBus';
export type ServerServices = ReturnType<typeof getInitialServices> & {
  checkout: CheckoutApplicationService;
  inventory: InventoryApplicationService;
  admin: AdminApplicationService;
  refunds: RefundApplicationService;
  support: SupportApplicationService;
  crm: CrmApplicationService;
  commerceEventBus: ICommerceEventBus;
  commerceTimeline: CommerceTimelineService;
};

export async function getServerServices(): Promise<ServerServices> {
    assertProductionReadiness();
    return getInitialServices();
}
