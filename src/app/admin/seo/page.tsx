import { Suspense } from 'react';
import { AdminSeoHub } from '@ui/pages/admin/AdminSeoHub';
import { getAppSeoEngine } from '@infrastructure/seo';
import { getServerServices } from '@infrastructure/server/services';
import type { Metadata } from 'next';
import { buildNextPageMetadata } from '@infrastructure/seo';

const seo = getAppSeoEngine();

export const metadata: Metadata = buildNextPageMetadata(
  {
    title: 'Search & Visibility',
    description: 'WoodBine admin — search and visibility settings.',
    path: '/admin/seo',
    noIndex: true,
  },
  seo.config
);

export default async function AdminSeoPage() {
  const services = await getServerServices();
  const audit = seo.health.auditSite();

  const [productData, blogResult, merchCollections, categories] = await Promise.all([
    services.productService.getProducts({ limit: 500 }),
    services.knowledgebaseRepository
      .getArticles({ type: 'blog', status: 'all', limit: 500 })
      .catch(() => ({ articles: [] })),
    services.collectionService.list({ status: 'active', limit: 500 }).catch(() => []),
    services.taxonomyService.getAllCategories().catch(() => []),
  ]);

  const snapshot = seo.catalog.buildAdminSnapshot(
    productData.products,
    blogResult.articles,
    merchCollections,
    categories
  );
  snapshot.siteScore = audit.score;

  const report = seo.adminReport.buildReport(snapshot, {
    products: snapshot.products.total,
    collections: snapshot.collections.total,
    blogPosts: snapshot.blogPosts.total,
  });

  return (
    <Suspense fallback={<div className="p-8 text-sm text-gray-500">Loading Search & Visibility…</div>}>
      <AdminSeoHub
        audit={audit}
        snapshot={snapshot}
        report={report}
        siteHost={seo.preview.siteHostLabel()}
        homepagePreview={seo.preview.homepagePreview()}
      />
    </Suspense>
  );
}
