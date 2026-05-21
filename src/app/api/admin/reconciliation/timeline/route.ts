import { NextResponse } from 'next/server';
import { getServerServices } from '@infrastructure/server/services';
import { jsonError, requireAdminSession } from '@infrastructure/server/apiGuards';

export async function GET(request: Request) {
  try {
    await requireAdminSession(request);
    const { searchParams } = new URL(request.url);
    const attemptId = searchParams.get('attemptId');

    if (!attemptId) {
      return NextResponse.json({ error: 'Missing required query parameter: attemptId' }, { status: 400 });
    }

    const services = await getServerServices();
    const timeline = await services.orderService.getForensicTimeline(attemptId);

    return NextResponse.json(timeline);
  } catch (error) {
    return jsonError(error, 'Failed to fetch forensic checkout timeline', request);
  }
}
