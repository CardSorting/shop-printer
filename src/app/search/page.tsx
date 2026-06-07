import { Suspense } from 'react';
import { ProductsPage } from '@ui/pages/ProductsPage';
import type { Metadata } from 'next';
import { JsonLd } from '@ui/components/JsonLd';
import { buildNextPageMetadata, getAppSeoEngine } from '@infrastructure/seo';
import { breadcrumbJsonLd, cleanSeoText } from '@utils/seo';

type SearchProps = {
  searchParams: Promise<{ q?: string }>;
};

const seo = getAppSeoEngine();

export async function generateMetadata({ searchParams }: SearchProps): Promise<Metadata> {
  const { q = '' } = await searchParams;
  return buildNextPageMetadata(seo.pages.search(cleanSeoText(q)), seo.config);
}

export default async function SearchPage({ searchParams }: SearchProps) {
  const jsonLd = breadcrumbJsonLd([
    { name: 'Home', path: '/' },
    { name: 'Search', path: '/search' },
  ]);

  return (
    <>
      <JsonLd data={jsonLd} />
      <Suspense fallback={<div className="mx-auto max-w-7xl px-4 py-12 text-sm font-bold text-gray-500">Searching menu...</div>}>
        <ProductsPage />
      </Suspense>
    </>
  );
}
