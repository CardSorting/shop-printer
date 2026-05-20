import { NextResponse } from 'next/server';
import { getInitialServices } from '@core/container';
import { jsonError, readJsonObject, requireAdminSession } from '@infrastructure/server/apiGuards';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAdminSession(req);
    const { id } = await params;
    const services = getInitialServices();
    const { status } = await readJsonObject(req);
    
    if (typeof status !== 'string' || !['published', 'spam'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    await services.knowledgebaseRepository.updateCommentStatus(id, status as any);

    await services.auditService.record({
      userId: user.id,
      userEmail: user.email,
      action: 'blog.comment_status_updated',
      targetId: id,
      details: { commentId: id, status }
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    return jsonError(err, 'Failed to update comment status');
  }
}
