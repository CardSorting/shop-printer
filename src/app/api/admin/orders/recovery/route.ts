import { NextResponse } from 'next/server';
import { getServerServices } from '@infrastructure/server/services';
import { jsonError, parseBoundedLimit, requireAdminSession } from '@infrastructure/server/apiGuards';

export async function GET(request: Request) {
  try {
    await requireAdminSession(request);
    const { searchParams } = new URL(request.url);
    const services = await getServerServices();

    return NextResponse.json(await services.orderService.getRecoveryReadModel({
      limit: parseBoundedLimit(searchParams.get('limit')),
    }));
  } catch (error) {
    return jsonError(error, 'Failed to load order recovery state');
  }
}
