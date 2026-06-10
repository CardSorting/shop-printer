import type { CatalogFilters } from './types';

const DEFAULT_SORT = 'newest';

const ALLOWED_SORT = new Set(['newest', 'price_asc', 'price_desc', 'name']);

function readSearchParam(
  filters: Record<string, string | string[] | undefined>,
  ...keys: string[]
): string {
  for (const key of keys) {
    const value = filters[key];
    if (typeof value === 'string') return value;
  }
  return '';
}

/**
 * Canonical URL query parsing for all catalog routes.
 * Routes must not parse sort/search params locally.
 */
export function readCatalogFilters(
  filters: Record<string, string | string[] | undefined>,
): CatalogFilters {
  const rawSort = readSearchParam(filters, 'sort_by', 'sort');
  const sortBy = ALLOWED_SORT.has(rawSort) ? rawSort : DEFAULT_SORT;
  const search = readSearchParam(filters, 'q', 'search').trim();
  return { sortBy, search };
}
