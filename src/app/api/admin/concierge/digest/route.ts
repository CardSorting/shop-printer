import { NextResponse } from 'next/server';
import { getServerServices } from '@infrastructure/server/services';
import { jsonError, requireAdminSession } from '@infrastructure/server/apiGuards';
import { logger } from '@utils/logger';

export async function GET(request: Request) {
  try {
    await requireAdminSession(request);
    const { conciergeService } = await getServerServices();
    const digest = await conciergeService.generateStoreDigest();
    if (!digest) throw new Error('Failed to generate digest');
    return NextResponse.json(digest);
  } catch (error) {
    logger.error('Digest API error', error);
    return jsonError(error, 'Failed to load intelligence', request);
  }
}
