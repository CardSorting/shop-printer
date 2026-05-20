import { NextRequest, NextResponse } from 'next/server';
import { getInitialServices } from '@core/container';
import { jsonError, readJsonObject, requireAdminSession } from '@infrastructure/server/apiGuards';
import { parseArticleBatchUpdate, parseArticleIds } from '../parsers';

export async function PATCH(req: NextRequest) {
  try {
    await requireAdminSession(req);
    const services = getInitialServices();
    const { ids, updates } = await readJsonObject(req);
    const articleIds = parseArticleIds(ids);
    const articleUpdates = await parseArticleBatchUpdate(updates);

    await services.knowledgebaseRepository.batchUpdateArticles(articleIds, articleUpdates);
    
    return NextResponse.json({ success: true, updatedCount: articleIds.length });
  } catch (err) {
    console.error('Batch update failed:', err);
    return jsonError(err, 'Failed to perform batch update');
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await requireAdminSession(req);
    const services = getInitialServices();
    const { ids } = await readJsonObject(req);
    const articleIds = parseArticleIds(ids);

    await services.knowledgebaseRepository.batchDeleteArticles(articleIds);
    
    return NextResponse.json({ success: true, deletedCount: articleIds.length });
  } catch (err) {
    console.error('Batch delete failed:', err);
    return jsonError(err, 'Failed to perform batch delete');
  }
}
