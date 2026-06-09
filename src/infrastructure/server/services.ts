/**
 * [LAYER: INFRASTRUCTURE]
 * Server-side service initialization.
 */
import { getInitialServices } from '@core/container';
import type { CheckoutApplicationService } from '@core/order/checkoutApplicationService';

export type ServerServices = ReturnType<typeof getInitialServices> & {
  checkout: CheckoutApplicationService;
};

export async function getServerServices(): Promise<ServerServices> {
    return getInitialServices();
}
