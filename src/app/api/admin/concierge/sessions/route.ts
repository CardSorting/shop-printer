import { NextRequest, NextResponse } from 'next/server';
import { getServerServices } from '@infrastructure/server/services';
import { jsonError, parseBoundedLimit, requireAdminSession } from '@infrastructure/server/apiGuards';
import { logger } from '@utils/logger';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    await requireAdminSession(req);
    const { conciergeService } = await getServerServices();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (id) {
      const session = await conciergeService.getSession(id);
      if (!session) {
        return NextResponse.json({ error: 'Session not found' }, { status: 404 });
      }
      return NextResponse.json(session);
    }

    const sessions = await conciergeService.listSessions(parseBoundedLimit(searchParams.get('limit'), 50, 100));

    return NextResponse.json(sessions);
  } catch (error) {
    logger.error('Failed to fetch Concierge sessions', { error: error instanceof Error ? error.message : String(error) });
    return jsonError(error, 'Failed to fetch Concierge sessions', req);
  }
}
