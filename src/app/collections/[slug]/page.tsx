import { ProductsPage } from '@ui/pages/ProductsPage';
import type { Metadata } from 'next';
import { JsonLd } from '@ui/components/JsonLd';
import { getServerServices } from '@infrastructure/server/services';
import { notFound } from 'next/navigation';
import { buildNextPageMetadata, getAppSeoEngine } from '@infrastructure/seo';
import { breadcrumbJsonLd, itemListJsonLd } from '@utils/seo';
import { loadCatalogBootstrap, serializeCatalogBootstrap } from '@infrastructure/server/loadCatalogBootstrap';

const seo = getAppSeoEngine();

async function getCategoryOrCollection(slug: string) {
  const services = await getServerServices();
  try {
    const category = await services.taxonomyService.getCategoryBySlug(slug);
    if (category) return { type: 'category' as const, data: category };

    const collection = await services.collectionService.getByHandle(slug);
    if (collection) return { type: 'collection' as const, data: collection };

    return null;
  } catch {
    return null;
  }
}

function readCatalogFilters(filters: Record<string, string | string[] | undefined>) {
  const sortBy = typeof filters.sort_by === 'string' ? filters.sort_by : 'newest';
  const search =
    typeof filters.q === 'string' ? filters.q : typeof filters.search === 'string' ? filters.search : '';
  return { sortBy, search };
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<Metadata> {
  const { slug } = await params;
  const filters = await searchParams;
  const resolved = await getCategoryOrCollection(slug);
  const hasFilters = Object.keys(filters).length > 0;

  if (!resolved) {
    const fallbackTitle = slug.split('-').map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    return buildNextPageMetadata(
      seo.pages.collectionListing({ name: fallbackTitle, slug }, hasFilters),
      seo.config
    );
  }

  const listingInput =
    resolved.type === 'collection'
      ? {
          name: resolved.data.name,
          slug,
          description: resolved.data.description,
          seoTitle: resolved.data.seoTitle,
          seoDescription: resolved.data.seoDescription,
          imageUrl: resolved.data.imageUrl,
        }
      : {
          name: resolved.data.name,
          slug,
          description: resolved.data.description,
          seoTitle: resolved.data.seoTitle,
          seoDescription: resolved.data.seoDescription,
        };

  return buildNextPageMetadata(seo.pages.collectionListing(listingInput, hasFilters), seo.config);
}

export default async function CollectionPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const filters = await searchParams;
  const { sortBy, search } = readCatalogFilters(filters);
  const resolved = await getCategoryOrCollection(slug);

  if (!resolved && slug !== 'all') {
    notFound();
  }

  const collectionInfo = resolved
    ? {
        name: resolved.data.name,
        description: resolved.data.description || '',
        ...(resolved.type === 'collection' ? { imageUrl: resolved.data.imageUrl } : {}),
      }
    : null;

  const bootstrap = serializeCatalogBootstrap(
    await loadCatalogBootstrap({
      resolvedType: resolved?.type,
      collectionSlug: slug,
      query: search,
      sortBy,
      collectionInfo,
    }),
  );

  const displayName = resolved?.data.name || 'All Vendors & Menu';
  const jsonLd = [
    breadcrumbJsonLd([
      { name: 'Home', path: '/' },
      { name: 'Hall Favorites', path: '/collections/bestsellers' },
      { name: displayName, path: `/collections/${slug}` },
    ]),
    itemListJsonLd(displayName, `/collections/${slug}`, [
      { name: displayName, path: `/collections/${slug}` },
    ]),
  ];

  return (
    <>
      <JsonLd data={jsonLd} />
      <ProductsPage
        resolvedType={resolved?.type}
        resolvedSlug={slug}
        initialProducts={bootstrap.products}
        initialNextCursor={bootstrap.nextCursor}
        initialCategories={bootstrap.categories}
        initialCollectionInfo={bootstrap.collectionInfo}
        initialSortBy={sortBy}
        initialSearch={search}
      />
    </>
  );
}
