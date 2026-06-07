import { Suspense } from 'react';
import { ProductsPage } from '@ui/pages/ProductsPage';
import type { Metadata } from 'next';
import { getServerServices } from '@infrastructure/server/services';
import { notFound } from 'next/navigation';
import { buildNextPageMetadata, getAppSeoEngine } from '@infrastructure/seo';
import { breadcrumbJsonLd, cleanSeoText, itemListJsonLd } from '@utils/seo';

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

export default async function CollectionPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const resolved = await getCategoryOrCollection(slug);

  if (!resolved && slug !== 'all') {
    notFound();
  }

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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Suspense fallback={<div className="mx-auto max-w-7xl px-4 py-12 text-sm font-bold text-gray-500">Loading vendors...</div>}>
        <ProductsPage resolvedType={resolved?.type} resolvedSlug={slug} />
      </Suspense>
    </>
  );
}
