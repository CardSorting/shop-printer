import { NextResponse } from 'next/server';
import { getServerServices } from '@infrastructure/server/services';
import { adminRouteResponse } from '@infrastructure/server/adminRouteAdapter';
import { toAdminActor } from '@infrastructure/server/adminActor';
import { jsonError, readJsonObject, requireAdminSession, requireString } from '@infrastructure/server/apiGuards';
import { DomainError } from '@domain/errors';

function parsePackageDimensions(value: unknown): { length: string; width: string; height: string } | undefined {
    if (value === undefined || value === null || value === '') return undefined;
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        throw new DomainError('packageDimensions must be an object.');
    }
    const body = value as Record<string, unknown>;
    return {
        length: requireString(String(body.length ?? ''), 'packageDimensions.length'),
        width: requireString(String(body.width ?? ''), 'packageDimensions.width'),
        height: requireString(String(body.height ?? ''), 'packageDimensions.height'),
    };
}

function parseOptionalNumber(value: unknown, field: string): number | undefined {
    if (value === undefined || value === null || value === '') return undefined;
    if (typeof value !== 'number' || !Number.isFinite(value)) throw new DomainError(`${field} must be a number.`);
    return value;
}

/**
 * [LAYER: API]
 * Export orders to Pirate Ship compatible CSV format.
 */
export async function POST(request: Request) {
    try {
        const user = await requireAdminSession(request);
        const body = await readJsonObject(request);
        const { ids, packageDimensions, tareWeight } = body;

        if (!Array.isArray(ids)) {
            throw new Error('IDs must be an array');
        }

        const validatedIds = ids.map((id, i) => requireString(id, `ids[${i}]`));

        const services = await getServerServices();
        const result = await services.admin.exportOrdersToPirateShipCsv({
            actor: toAdminActor(user),
            orderIds: validatedIds,
            packageDimensions: parsePackageDimensions(packageDimensions),
            tareWeight: parseOptionalNumber(tareWeight, 'tareWeight'),
        });
        if (!result.ok) return adminRouteResponse(result);
        const csv = result.data;

        return new NextResponse(csv, {
            headers: {
                'Content-Type': 'text/csv',
                'Content-Disposition': 'attachment; filename="pirate_ship_export.csv"',
            },
        });
    } catch (error) {
        return jsonError(error, 'Failed to export orders to CSV');
    }
}
