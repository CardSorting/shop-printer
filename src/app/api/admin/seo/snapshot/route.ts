import { NextResponse } from 'next/server';
import { getServerServices } from '@infrastructure/server/services';
import { getAppSeoEngine } from '@infrastructure/seo';
import { jsonError, requireAdminSession } from '@infrastructure/server/apiGuards';

export async function GET(req: Request) {
  try {
    await requireAdminSession(req);
    const seo = getAppSeoEngine();
    const services = await getServerServices();

    const [productData, blogResult] = await Promise.all([
      services.productService.getProducts({ limit: 500 }),
      services.knowledgebaseRepository
        .getArticles({ type: 'blog', status: 'all', limit: 500 })
        .catch(() => ({ articles: [] })),
    ]);

    const siteAudit = seo.health.auditSite();
    const snapshot = seo.catalog.buildAdminSnapshot(productData.products, blogResult.articles);
    snapshot.siteScore = siteAudit.score;

    return NextResponse.json({
      site: siteAudit,
      snapshot,
      siteHost: seo.preview.siteHostLabel(),
      homepagePreview: seo.preview.homepagePreview(),
    });
  } catch (error) {
    return jsonError(error, 'Failed to load SEO snapshot');
  }
}
