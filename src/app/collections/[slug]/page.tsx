import type { Metadata } from 'next';
import { JsonLd } from '@ui/components/JsonLd';
import { notFound } from 'next/navigation';
import { buildNextPageMetadata, getAppSeoEngine } from '@infrastructure/seo';
import { breadcrumbJsonLd, itemListJsonLd } from '@utils/seo';
import { prepareCatalogPage, resolveCatalogSlug } from '@infrastructure/server/catalog';
import { CatalogPage, CatalogLcpPreload } from '@ui/pages/catalog';

const seo = getAppSeoEngine();

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<Metadata> {
  const { slug } = await params;
  const filters = await searchParams;
  const resolved = await resolveCatalogSlug(slug);
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
  const prepared = await prepareCatalogPage({ kind: 'collection', slug, filters });

  if (prepared.notFound) {
    notFound();
  }

  const jsonLd = [
    breadcrumbJsonLd([
      { name: 'Home', path: '/' },
      { name: 'Hall Favorites', path: '/collections/bestsellers' },
      { name: prepared.displayName, path: `/collections/${slug}` },
    ]),
    itemListJsonLd(prepared.displayName, `/collections/${slug}`, [
      { name: prepared.displayName, path: `/collections/${slug}` },
    ]),
  ];

  return (
    <>
      <CatalogLcpPreload imageUrls={prepared.lcpImageUrls} />
      <JsonLd data={jsonLd} />
      <CatalogPage {...prepared.pageProps} />
    </>
  );
}
