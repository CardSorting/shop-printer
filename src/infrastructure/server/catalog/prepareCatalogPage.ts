import { loadCatalogBootstrap, serializeCatalogBootstrap } from './loadCatalogBootstrap';
import { buildServerCatalogCacheKey, serverCatalogCacheTags } from './cacheKeys';
import { CATALOG_TAXONOMY_REVALIDATE_SECONDS } from './constants';
import { selectLcpImageUrls } from './lcp';
import { readCatalogFilters } from './readCatalogFilters';
import { resolveCatalogSlug } from './resolveCatalogSlug';
import type { CatalogPageProps, PreparedCatalogPage, PreparedCatalogPageResult } from './types';

export type PrepareCatalogPageInput =
  | {
      kind: 'collection';
      slug: string;
      filters: Record<string, string | string[] | undefined>;
    }
  | {
      kind: 'search';
      filters: Record<string, string | string[] | undefined>;
    };

function buildPageProps(
  bootstrap: PreparedCatalogPage['bootstrap'],
  overrides: Partial<CatalogPageProps> & Pick<CatalogPageProps, 'initialSortBy' | 'initialSearch'>,
): CatalogPageProps {
  return {
    initialProducts: bootstrap.products,
    initialNextCursor: bootstrap.nextCursor,
    initialCategories: bootstrap.categories,
    initialCollectionInfo: bootstrap.collectionInfo,
    initialSortBy: overrides.initialSortBy,
    initialSearch: overrides.initialSearch,
    resolvedType: overrides.resolvedType,
    resolvedSlug: overrides.resolvedSlug,
  };
}

function buildPreparedPage(
  input: {
    kind: 'collection' | 'search';
    slug?: string;
    resolvedType?: 'category' | 'collection';
    sortBy: string;
    search: string;
    displayName: string;
  },
  bootstrap: PreparedCatalogPage['bootstrap'],
  pageProps: CatalogPageProps,
): PreparedCatalogPage {
  const cacheInput = {
    kind: input.kind,
    slug: input.slug,
    resolvedType: input.resolvedType,
    sortBy: input.sortBy,
    search: input.search,
  };

  return {
    bootstrap,
    pageProps,
    lcpImageUrls: selectLcpImageUrls(bootstrap.products),
    displayName: input.displayName,
    slug: input.slug,
    cache: {
      key: buildServerCatalogCacheKey(cacheInput),
      ttl: CATALOG_TAXONOMY_REVALIDATE_SECONDS,
      tags: serverCatalogCacheTags(cacheInput),
    },
  };
}

/**
 * Storefront read protocol entry point.
 * Routes prepare catalog data here — never assemble bootstrap locally.
 */
export async function prepareCatalogPage(
  input: PrepareCatalogPageInput,
): Promise<PreparedCatalogPageResult> {
  const { sortBy, search } = readCatalogFilters(input.filters);

  if (input.kind === 'search') {
    const bootstrap = serializeCatalogBootstrap(
      await loadCatalogBootstrap({ query: search, sortBy }),
    );

    const pageProps = buildPageProps(bootstrap, {
      initialSortBy: sortBy,
      initialSearch: search,
    });

    return {
      notFound: false,
      ...buildPreparedPage(
        { kind: 'search', sortBy, search, displayName: search ? `Search: ${search}` : 'Search' },
        bootstrap,
        pageProps,
      ),
    };
  }

  const { slug } = input;
  const resolved = await resolveCatalogSlug(slug);

  if (!resolved && slug !== 'all') {
    return { notFound: true, slug };
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

  const pageProps = buildPageProps(bootstrap, {
    resolvedType: resolved?.type,
    resolvedSlug: slug,
    initialSortBy: sortBy,
    initialSearch: search,
  });

  return {
    notFound: false,
    ...buildPreparedPage(
      {
        kind: 'collection',
        slug,
        resolvedType: resolved?.type,
        sortBy,
        search,
        displayName: resolved?.data.name || 'All Vendors & Menu',
      },
      bootstrap,
      pageProps,
    ),
  };
}

/** @deprecated Use prepareCatalogPage({ kind: 'collection', ... }) */
export async function prepareCollectionCatalog(
  slug: string,
  filters: Record<string, string | string[] | undefined>,
): Promise<PreparedCatalogPageResult> {
  return prepareCatalogPage({ kind: 'collection', slug, filters });
}

/** @deprecated Use prepareCatalogPage({ kind: 'search', ... }) */
export async function prepareSearchCatalog(
  filters: Record<string, string | string[] | undefined>,
): Promise<PreparedCatalogPage & { notFound: false }> {
  const result = await prepareCatalogPage({ kind: 'search', filters });
  if (result.notFound) {
    throw new Error('Search catalog prepare returned notFound');
  }
  return result;
}
