import { NextResponse } from 'next/server';
import { getServerServices } from '@infrastructure/server/services';
import { jsonError, readJsonObject, requireAdminSession } from '@infrastructure/server/apiGuards';
import { parseShippingRate } from '../parsers';

export async function GET(request: Request) {
    try {
        await requireAdminSession(request);
        const services = await getServerServices();
        return NextResponse.json(await services.shippingService.getAllRates());
    } catch (error) {
        return jsonError(error, 'Failed to load shipping rates');
    }
}

export async function POST(request: Request) {
    try {
        const user = await requireAdminSession(request);
        const body = await readJsonObject(request);
        const services = await getServerServices();
        const rate = await services.shippingService.saveRate(parseShippingRate(body), { id: user.id, email: user.email });
        return NextResponse.json(rate);
    } catch (error) {
        return jsonError(error, 'Failed to save shipping rate');
    }
}
