import { NextResponse } from 'next/server';
import { getServerServices } from '@infrastructure/server/services';
import { jsonError } from '@infrastructure/server/apiGuards';

export async function GET() {
    try {
        const services = await getServerServices();
        return NextResponse.json(await services.shippingService.getAllRates());
    } catch (error) {
        return jsonError(error, 'Failed to load shipping rates');
    }
}
