import { NextRequest, NextResponse } from 'next/server';
import { getServerServices } from '@infrastructure/server/services';
import { jsonError, readJsonObject, requireAdminSession, requireString } from '@infrastructure/server/apiGuards';
import { logger } from '@utils/logger';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  return NextResponse.json({ error: 'Concierge is disabled' }, { status: 503 });
  try {
    const user = await requireAdminSession(req);
    const body = await readJsonObject(req);
    const sessionId = requireString(body.sessionId, 'sessionId');
    const { conciergeService, auditService } = await getServerServices();
    const result = await conciergeService.analyzeStoredSession(sessionId);

    await auditService.record({
      userId: user.id,
      userEmail: user.email,
      action: 'concierge_analyzed',
      targetId: sessionId,
      details: { source: 'admin_concierge_analyze' },
    });

    return NextResponse.json(result);
  } catch (err) {
    const error = err as any;
    logger.error('Failed to trigger session analysis', { error: error instanceof Error ? error.message : String(error) });
    return jsonError(error, 'Failed to trigger session analysis', req);
  }
}
