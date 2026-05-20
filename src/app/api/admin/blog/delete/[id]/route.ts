import { NextResponse } from 'next/server';
import { getInitialServices } from '@core/container';
import { jsonError, requireAdminSession, requireString } from '@infrastructure/server/apiGuards';

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdminSession(req);
    const { id: rawId } = await params;
    const id = requireString(rawId, 'id');
    const services = getInitialServices();
    await services.knowledgebaseRepository.deleteArticle(id);
    return NextResponse.json({ success: true, deletedId: id });
  } catch (err) {
    return jsonError(err, 'Failed to delete article');
  }
}
