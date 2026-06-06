/**
 * [LAYER: CORE — SEO]
 * Shared loader for admin SEO hub + snapshot API — single source for catalog + report.
 */

import { getAppSeoEngine } from '@infrastructure/seo';
import type { getServerServices } from '@infrastructure/server/services';
import type { SeoAdminReport } from './SeoAdminReportService';
import type { SeoAdminSnapshot } from './CatalogAuditService';
import type { SiteSeoAudit } from '@domain/seo/health';
import type { SeoGooglePreview } from '@domain/seo/preview';

type ServerServices = Awaited<ReturnType<typeof getServerServices>>;

export interface AdminSeoBundle {
  audit: SiteSeoAudit;
  snapshot: SeoAdminSnapshot;
  report: SeoAdminReport;
  siteHost: string;
  homepagePreview: SeoGooglePreview;
}

export async function loadAdminSeoBundle(services: ServerServices): Promise<AdminSeoBundle> {
  const seo = getAppSeoEngine();
  const audit = seo.health.auditSite();

  const [productData, blogResult, helpResult, helpCategories, merchCollections, categories] =
    await Promise.all([
    services.productService.getProducts({ limit: 500 }),
    services.knowledgebaseRepository
      .getArticles({ type: 'blog', status: 'all', limit: 500 })
      .catch(() => ({ articles: [] })),
    services.knowledgebaseRepository
      .getArticles({ type: 'article', status: 'published', limit: 500 })
      .catch(() => ({ articles: [] })),
    services.knowledgebaseRepository.getCategories().catch(() => []),
    services.collectionService.list({ status: 'active', limit: 500 }).catch(() => []),
    services.taxonomyService.getAllCategories().catch(() => []),
  ]);

  const snapshot = seo.catalog.buildAdminSnapshot(
    productData.products,
    blogResult.articles,
    merchCollections,
    categories,
    helpResult.articles,
    helpCategories
  );
  snapshot.siteScore = audit.score;

  const report = seo.adminReport.buildReport(snapshot, {
    products: snapshot.products.total,
    collections: snapshot.collections.total,
    blogPosts: snapshot.blogPosts.total,
    helpArticles: snapshot.helpArticles.total,
    helpCategories: helpCategories.length,
  });

  return {
    audit,
    snapshot,
    report,
    siteHost: seo.preview.siteHostLabel(),
    homepagePreview: seo.preview.homepagePreview(),
  };
}
