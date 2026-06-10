/**
 * Catalog server module — storefront read protocol.
 *
 * Routes import only from here. Never call loadCatalogBootstrap directly.
 */
export type {
  CatalogBootstrap,
  CatalogCollectionInfo,
  CatalogFilters,
  CatalogPageProps,
  PreparedCatalogPage,
  PreparedCatalogPageResult,
} from './types';
export type { ResolvedCatalogSlug } from './resolveCatalogSlug';
export type { PrepareCatalogPageInput } from './prepareCatalogPage';
export type { ServerCatalogCacheKeyInput } from './cacheKeys';

export {
  CATALOG_SERVER_PAGE_SIZE,
  CATALOG_TAXONOMY_REVALIDATE_SECONDS,
  CATALOG_SERVER_CACHE_TAGS,
} from './constants';
export { buildServerCatalogCacheKey, serverCatalogCacheTags } from './cacheKeys';
export { selectLcpImageUrls, CATALOG_LCP_PRELOAD_COUNT } from './lcp';
export { getCachedCatalogCategories } from './cachedCatalogTaxonomy';
export { resolveCatalogSlug } from './resolveCatalogSlug';
export { readCatalogFilters } from './readCatalogFilters';
export {
  prepareCatalogPage,
  prepareCollectionCatalog,
  prepareSearchCatalog,
} from './prepareCatalogPage';
