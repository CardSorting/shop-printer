import { NextResponse } from 'next/server';
import { UnauthorizedError, DomainError } from '@domain/errors';
import { getServerServices } from '@infrastructure/server/services';
import { jsonError, requireSessionUser } from '@infrastructure/server/apiGuards';

const SESSION_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function getOptionalSessionUser(request: Request) {
  try {
    return await requireSessionUser(request);
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id')?.trim();
    if (!id || !SESSION_ID_PATTERN.test(id)) throw new DomainError('Session ID is invalid.');

    const { conciergeService } = await getServerServices();
    const session = await conciergeService.getSession(id);
    if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 });

    const currentUser = await getOptionalSessionUser(request);
    if (session.userId && session.userId !== 'anonymous' && currentUser?.id !== session.userId) {
      throw new UnauthorizedError('Session access denied.');
    }

    return NextResponse.json({
      id: session.id,
      status: session.status,
      transcript: session.transcript || [],
      updatedAt: session.updatedAt,
    });
  } catch (error) {
    return jsonError(error, 'Failed to restore concierge session', request);
  }
}
