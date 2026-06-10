import { describe, expect, it } from 'vitest';
import { buildServerCatalogCacheKey } from './cacheKeys';
import { buildCatalogCacheKey } from '@ui/pages/catalog/catalogCache';

describe('catalog cache keys', () => {
  it('server keys are stable for equivalent filter input', () => {
    const a = buildServerCatalogCacheKey({
      kind: 'collection',
      slug: 'tea',
      resolvedType: 'category',
      sortBy: 'newest',
      search: 'honey',
    });
    const b = buildServerCatalogCacheKey({
      kind: 'collection',
      slug: 'tea',
      resolvedType: 'category',
      sortBy: 'newest',
      search: 'honey',
    });
    expect(a).toBe(b);
  });

  it('client keys sort category slugs for stability', () => {
    const a = buildCatalogCacheKey({
      categorySlugs: ['b', 'a'],
      query: 'x',
      collectionSlug: 'hall',
      resolvedType: 'collection',
    });
    const b = buildCatalogCacheKey({
      categorySlugs: ['a', 'b'],
      query: 'x',
      collectionSlug: 'hall',
      resolvedType: 'collection',
    });
    expect(a).toBe(b);
  });
});
