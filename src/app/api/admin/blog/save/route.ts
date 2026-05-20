import { NextResponse } from 'next/server';
import { getInitialServices } from '@core/container';
import { jsonError, readJsonObjectWithLimit, requireAdminSession } from '@infrastructure/server/apiGuards';
import { parseArticlePayload } from '../parsers';

const MAX_ARTICLE_BODY_BYTES = 256 * 1024;

export async function POST(req: Request) {
  try {
    await requireAdminSession(req);
    const services = getInitialServices();
    const body = await readJsonObjectWithLimit(req, MAX_ARTICLE_BODY_BYTES);
    const article = await parseArticlePayload(body);
    
    await services.knowledgebaseRepository.saveArticle(article);
    const saved = await services.knowledgebaseRepository.getArticleById(article.id);

    return NextResponse.json(saved ?? article);
  } catch (err) {
    return jsonError(err, 'Failed to save article');
  }
}
