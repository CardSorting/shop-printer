import { CATALOG_SERVER_CACHE_TAGS } from './constants';

export type ServerCatalogCacheKeyInput = {
  kind: 'collection' | 'search';
  slug?: string;
  resolvedType?: 'category' | 'collection';
  sortBy: string;
  search: string;
};

/** Canonical server-side catalog cache identity for prepared pages. */
export function buildServerCatalogCacheKey(input: ServerCatalogCacheKeyInput): string {
  return JSON.stringify({
    k: input.kind,
    s: input.slug ?? '',
    t: input.resolvedType ?? '',
    sort: input.sortBy,
    q: input.search.trim(),
  });
}

export function serverCatalogCacheTags(input: ServerCatalogCacheKeyInput): string[] {
  const tags = [CATALOG_SERVER_CACHE_TAGS.categories, CATALOG_SERVER_CACHE_TAGS.products];
  if (input.kind === 'collection' && input.slug) {
    tags.push(`catalog-slug-${input.slug}`);
  }
  if (input.search.trim()) {
    tags.push('catalog-search');
  }
  return tags;
}
