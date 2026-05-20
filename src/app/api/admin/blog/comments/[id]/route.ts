import { NextResponse } from 'next/server';
import { getInitialServices } from '@core/container';
import { jsonError, requireAdminSession } from '@infrastructure/server/apiGuards';

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAdminSession(req);
    const { id } = await params;
    const services = getInitialServices();
    await services.knowledgebaseRepository.deleteComment(id);
    
    await services.auditService.record({
      userId: user.id,
      userEmail: user.email,
      action: 'blog.comment_deleted',
      targetId: id,
      details: { commentId: id }
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    return jsonError(err, 'Failed to delete comment');
  }
}
