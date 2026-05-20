import { NextResponse } from 'next/server';
import { getServerServices } from '@infrastructure/server/services';
import { jsonError, readJsonObject, requireAdminSession } from '@infrastructure/server/apiGuards';
import { parseShippingZone } from '../parsers';

export async function GET(request: Request) {
    try {
        await requireAdminSession(request);
        const services = await getServerServices();
        return NextResponse.json(await services.shippingService.getAllZones());
    } catch (error) {
        return jsonError(error, 'Failed to load shipping zones');
    }
}

export async function POST(request: Request) {
    try {
        const user = await requireAdminSession(request);
        const body = await readJsonObject(request);
        const services = await getServerServices();
        const zone = await services.shippingService.saveZone(parseShippingZone(body), { id: user.id, email: user.email });
        return NextResponse.json(zone);
    } catch (error) {
        return jsonError(error, 'Failed to save shipping zone');
    }
}
