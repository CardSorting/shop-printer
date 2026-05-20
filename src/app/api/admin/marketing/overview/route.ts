import { NextResponse } from 'next/server';
import { getServerServices } from '@infrastructure/server/services';
import { jsonError, requireAdminSession } from '@infrastructure/server/apiGuards';

export async function GET(request: Request) {
  try {
    await requireAdminSession(request);
    const { campaignService } = await getServerServices();

    const overview = await campaignService.getOverview();
    
    return NextResponse.json(overview);
  } catch (error) {
    return jsonError(error, 'Failed to fetch marketing overview', request);
  }
}
