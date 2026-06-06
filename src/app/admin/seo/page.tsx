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

  const [productData, blogResult] = await Promise.all([
    services.productService.getProducts({ limit: 500 }),
    services.knowledgebaseRepository
      .getArticles({ type: 'blog', status: 'all', limit: 500 })
      .catch(() => ({ articles: [] })),
  ]);

  const snapshot = seo.catalog.buildAdminSnapshot(productData.products, blogResult.articles);
  snapshot.siteScore = audit.score;

  return (
    <Suspense fallback={<div className="p-8 text-sm text-gray-500">Loading Search & Visibility…</div>}>
      <AdminSeoHub
        audit={audit}
        snapshot={snapshot}
        siteHost={seo.preview.siteHostLabel()}
        homepagePreview={seo.preview.homepagePreview()}
      />
    </Suspense>
  );
}
