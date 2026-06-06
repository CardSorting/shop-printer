import { Suspense } from 'react';
import { AdminSeoHub } from '@ui/pages/admin/AdminSeoHub';
import { getAppSeoEngine } from '@infrastructure/seo';
import { getServerServices } from '@infrastructure/server/services';
import { loadAdminSeoBundle } from '@core/seo/loadAdminSeoBundle';
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
  const bundle = await loadAdminSeoBundle(services);

  return (
    <Suspense fallback={<div className="p-8 text-sm text-gray-500">Loading Search & Visibility…</div>}>
      <AdminSeoHub
        audit={bundle.audit}
        snapshot={bundle.snapshot}
        report={bundle.report}
        siteHost={bundle.siteHost}
        homepagePreview={bundle.homepagePreview}
      />
    </Suspense>
  );
}
