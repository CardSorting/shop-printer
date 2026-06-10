import { describe, expect, it } from 'vitest';
import { buildCatalogCacheKey, mergeUniqueProducts } from './catalogCache';
import type { Product } from '@domain/models';

const product = (id: string): Product =>
  ({
    id,
    name: `Product ${id}`,
    price: 1000,
    stock: 5,
    handle: id,
    category: 'test',
    imageUrl: '/test.jpg',
  }) as Product;

describe('catalogCache', () => {
  it('builds stable keys regardless of category slug order', () => {
    const a = buildCatalogCacheKey({
      categorySlugs: ['b', 'a'],
      query: 'tea',
      collectionSlug: 'hall',
      resolvedType: 'collection',
    });
    const b = buildCatalogCacheKey({
      categorySlugs: ['a', 'b'],
      query: 'tea',
      collectionSlug: 'hall',
      resolvedType: 'collection',
    });
    expect(a).toBe(b);
  });

  it('merges pagination results without duplicate ids', () => {
    const existing = [product('1'), product('2')];
    const incoming = [product('2'), product('3')];
    expect(mergeUniqueProducts(existing, incoming).map((p) => p.id)).toEqual(['1', '2', '3']);
  });
});
