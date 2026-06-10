import { ProductsPage } from '@ui/pages/ProductsPage';
import type { Metadata } from 'next';
import { JsonLd } from '@ui/components/JsonLd';
import { buildNextPageMetadata, getAppSeoEngine } from '@infrastructure/seo';
import { breadcrumbJsonLd, cleanSeoText } from '@utils/seo';
import { loadCatalogBootstrap, serializeCatalogBootstrap } from '@infrastructure/server/loadCatalogBootstrap';

type SearchProps = {
  searchParams: Promise<{ q?: string; sort_by?: string }>;
};

const seo = getAppSeoEngine();

function readSearchFilters(filters: { q?: string; sort_by?: string }) {
  const sortBy = typeof filters.sort_by === 'string' ? filters.sort_by : 'newest';
  const search = typeof filters.q === 'string' ? filters.q : '';
  return { sortBy, search };
}

export async function generateMetadata({ searchParams }: SearchProps): Promise<Metadata> {
  const { q = '' } = await searchParams;
  return buildNextPageMetadata(seo.pages.search(cleanSeoText(q)), seo.config);
}

export default async function SearchPage({ searchParams }: SearchProps) {
  const filters = await searchParams;
  const { sortBy, search } = readSearchFilters(filters);

  const bootstrap = serializeCatalogBootstrap(
    await loadCatalogBootstrap({
      query: search,
      sortBy,
    }),
  );

  const jsonLd = breadcrumbJsonLd([
    { name: 'Home', path: '/' },
    { name: 'Search', path: '/search' },
  ]);

  return (
    <>
      <JsonLd data={jsonLd} />
      <ProductsPage
        initialProducts={bootstrap.products}
        initialNextCursor={bootstrap.nextCursor}
        initialCategories={bootstrap.categories}
        initialCollectionInfo={null}
        initialSortBy={sortBy}
        initialSearch={search}
      />
    </>
  );
}
