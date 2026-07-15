/** Client catalog tuning — must stay aligned with server catalog/constants (see guard test). */
export const CATALOG_PAGE_SIZE = 20;
export const CATALOG_SEARCH_DEBOUNCE_MS = 300;
export const CATALOG_CACHE_TTL_MS = 90_000;
export const CATALOG_CACHE_MAX_ENTRIES = 24;
export const CATALOG_INFINITE_SCROLL_ROOT_MARGIN = '480px 0px';
export const CATALOG_INITIAL_SKELETON_COUNT = 9;
export const CATALOG_LOAD_MORE_SKELETON_COUNT = 3;
export const CATALOG_PRIORITY_IMAGE_COUNT = 3;
export const CATALOG_STAGGERED_ANIMATION_COUNT = 6;
export const CATALOG_GRID_STORAGE_KEY = 'meowacc_catalog_grid_cols';

export const CATALOG_SORT_OPTIONS = [
  { value: 'newest', label: 'Sort By: Newest' },
  { value: 'price_asc', label: 'Sort By: Price Low-High' },
  { value: 'price_desc', label: 'Sort By: Price High-Low' },
  { value: 'name', label: 'Sort By: Alphabetical' },
] as const;

export type CatalogSortValue = (typeof CATALOG_SORT_OPTIONS)[number]['value'];

export const CATALOG_IMAGE_SIZES = {
  2: '(max-width: 640px) calc(100vw - 2rem), (max-width: 1280px) calc(50vw - 3rem), 624px',
  3: '(max-width: 640px) calc(100vw - 2rem), (max-width: 1280px) calc(50vw - 3rem), 405px',
  4: '(max-width: 640px) calc(100vw - 2rem), (max-width: 1280px) calc(50vw - 3rem), 296px',
} as const;

export const CATALOG_GRID_CLASS = {
  2: 'xl:grid-cols-2',
  3: 'xl:grid-cols-3',
  4: 'xl:grid-cols-4',
} as const;
