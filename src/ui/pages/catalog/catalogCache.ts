import type { Product } from '@domain/models';
import { CATALOG_CACHE_MAX_ENTRIES, CATALOG_CACHE_TTL_MS } from './constants';

export type CatalogCacheEntry = {
  products: Product[];
  nextCursor: string | null;
  fetchedAt: number;
};

const catalogCache = new Map<string, CatalogCacheEntry>();

export type CatalogQueryKey = {
  resolvedType?: 'category' | 'collection';
  collectionSlug?: string;
  categorySlugs: string[];
  query: string;
};

export function buildCatalogCacheKey(key: CatalogQueryKey): string {
  return JSON.stringify({
    t: key.resolvedType ?? '',
    s: key.collectionSlug ?? '',
    c: [...key.categorySlugs].sort(),
    q: key.query,
  });
}

export function readCatalogCache(key: string): CatalogCacheEntry | null {
  const entry = catalogCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.fetchedAt > CATALOG_CACHE_TTL_MS) {
    catalogCache.delete(key);
    return null;
  }
  return entry;
}

export function writeCatalogCache(key: string, products: Product[], nextCursor: string | null): void {
  if (catalogCache.size >= CATALOG_CACHE_MAX_ENTRIES) {
    const oldest = [...catalogCache.entries()].sort((a, b) => a[1].fetchedAt - b[1].fetchedAt)[0];
    if (oldest) catalogCache.delete(oldest[0]);
  }
  catalogCache.set(key, { products, nextCursor, fetchedAt: Date.now() });
}

export function mergeUniqueProducts(existing: Product[], incoming: Product[]): Product[] {
  const seen = new Set(existing.map((p) => p.id));
  const merged = [...existing];
  for (const product of incoming) {
    if (!seen.has(product.id)) {
      seen.add(product.id);
      merged.push(product);
    }
  }
  return merged;
}
