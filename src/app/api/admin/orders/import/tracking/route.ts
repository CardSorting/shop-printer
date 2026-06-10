import { NextResponse } from 'next/server';
import { getServerServices } from '@infrastructure/server/services';
import { adminRouteResponse } from '@infrastructure/server/adminRouteAdapter';
import { toAdminActor } from '@infrastructure/server/adminActor';
import { jsonError, readJsonObject, requireAdminSession, requireString } from '@infrastructure/server/apiGuards';
import { DomainError } from '@domain/errors';

/**
 * [LAYER: API]
 * Import tracking numbers from a CSV (Pirate Ship format).
 * Expects: { rows: [{ orderId: string, trackingNumber: string, carrier: string }] }
 */
export async function POST(request: Request) {
    try {
        const user = await requireAdminSession(request);
        const body = await readJsonObject(request);
        const { rows } = body;

        if (!Array.isArray(rows)) {
            throw new Error('Rows must be an array');
        }
        if (rows.length === 0) throw new DomainError('At least one tracking row is required.');
        if (rows.length > 250) throw new DomainError('Tracking import is limited to 250 rows at a time.');

        const services = await getServerServices();
        const actor = toAdminActor(user);

        let successCount = 0;
        const errors: string[] = [];

        for (let index = 0; index < rows.length; index++) {
            const row = rows[index];
            try {
                if (!row || typeof row !== 'object' || Array.isArray(row)) {
                    throw new DomainError('Tracking row must be an object.');
                }
                const orderId = requireString(row.orderId, 'orderId');
                const trackingNumber = requireString(row.trackingNumber, 'trackingNumber');
                const carrier = typeof row.carrier === 'string' && row.carrier.trim() ? row.carrier.trim() : 'USPS';
                const idempotencyBase = typeof body.idempotencyKey === 'string' ? body.idempotencyKey : 'tracking-import';

                const fulfillResult = await services.admin.fulfillOrder({
                    actor,
                    orderId,
                    trackingNumber,
                    shippingCarrier: carrier,
                    idempotencyKey: `${idempotencyBase}:fulfill:${orderId}:${index}`,
                });
                if (!fulfillResult.ok) {
                    throw new DomainError(fulfillResult.message);
                }

                const orderResult = await services.admin.getOrder({ actor, orderId });
                if (orderResult.ok && (orderResult.data.status === 'confirmed' || orderResult.data.status === 'processing')) {
                    const statusResult = await services.admin.updateOrderStatus({
                        actor,
                        orderId,
                        status: 'shipped',
                        idempotencyKey: `${idempotencyBase}:ship:${orderId}:${index}`,
                    });
                    if (!statusResult.ok) {
                        throw new DomainError(statusResult.message);
                    }
                }

                successCount++;
            } catch (err) {
                errors.push(`Row failed: ${err instanceof Error ? err.message : String(err)}`);
            }
        }

        return NextResponse.json({ success: true, successCount, errors });
    } catch (error) {
        return jsonError(error, 'Failed to import tracking numbers');
    }
}
