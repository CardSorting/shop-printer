import type { Metadata } from 'next';
import { JsonLd } from '@ui/components/JsonLd';
import { buildNextPageMetadata, getAppSeoEngine } from '@infrastructure/seo';
import { breadcrumbJsonLd, cleanSeoText } from '@utils/seo';
import { prepareCatalogPage } from '@infrastructure/server/catalog';
import { CatalogPage, CatalogLcpPreload } from '@ui/pages/catalog';

type SearchProps = {
  searchParams: Promise<{ q?: string; sort_by?: string }>;
};

const seo = getAppSeoEngine();

export async function generateMetadata({ searchParams }: SearchProps): Promise<Metadata> {
  const { q = '' } = await searchParams;
  return buildNextPageMetadata(seo.pages.search(cleanSeoText(q)), seo.config);
}

export default async function SearchPage({ searchParams }: SearchProps) {
  const filters = await searchParams;
  const prepared = await prepareCatalogPage({ kind: 'search', filters });

  if (prepared.notFound) {
    throw new Error('Search catalog page returned notFound');
  }

  const jsonLd = breadcrumbJsonLd([
    { name: 'Home', path: '/' },
    { name: 'Search', path: '/search' },
  ]);

  return (
    <>
      <CatalogLcpPreload imageUrls={prepared.lcpImageUrls} />
      <JsonLd data={jsonLd} />
      <CatalogPage {...prepared.pageProps} />
    </>
  );
}
