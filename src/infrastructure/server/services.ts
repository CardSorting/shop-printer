/**
 * [LAYER: INFRASTRUCTURE]
 * Server-side service initialization.
 */
import { getInitialServices } from '@core/container';

export type ServerServices = ReturnType<typeof getInitialServices>;

export async function getServerServices(): Promise<ServerServices> {
    return getInitialServices();
}
