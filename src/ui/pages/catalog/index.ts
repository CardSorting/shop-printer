/**
 * Catalog UI module — storefront read protocol (client).
 *
 * ```txt
 * route → prepareCatalogPage() → CatalogPage → useCatalog()
 * ```
 */

export { CatalogPage } from './CatalogPage';

export { CatalogPageSkeleton } from './CatalogPageSkeleton';
export { useCatalog } from './hooks';
export { deriveCatalogViewState } from './viewState';

export { CatalogLcpPreload } from './CatalogLcpPreload';
export { CatalogProductGrid } from './CatalogProductGrid';
export { CatalogQuickView } from './CatalogQuickView';
export { CatalogSearchBar } from './CatalogSearchBar';
export { CatalogErrorBanner } from './CatalogErrorBanner';
export { CategoryNavLink } from './CategoryNavLink';

export type {
  CatalogPageProps,
  CatalogCollectionInfo,
  CatalogGridCols,
  CatalogProduct,
  CatalogViewState,
} from './types';

export {
  CATALOG_PAGE_SIZE,
  CATALOG_SEARCH_DEBOUNCE_MS,
  CATALOG_CACHE_TTL_MS,
  CATALOG_INITIAL_SKELETON_COUNT,
  CATALOG_SORT_OPTIONS,
  type CatalogSortValue,
} from './constants';

export { buildCatalogCacheKey, mergeUniqueProducts } from './catalogCache';
