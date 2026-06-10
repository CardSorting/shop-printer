import { describe, expect, it } from 'vitest';
import type { Product } from '@domain/models';
import { deriveCatalogViewState } from './viewState';

const product = (id: string): Product =>
  ({ id, name: id, price: 100, stock: 1, handle: id, category: 'x', imageUrl: '/x.jpg' }) as Product;

describe('deriveCatalogViewState', () => {
  it('returns loading when fetching with no products', () => {
    expect(
      deriveCatalogViewState({
        loading: true,
        isSearchSettling: false,
        error: null,
        visibleProducts: [],
        hasSearchQuery: false,
      }),
    ).toEqual({ state: 'loading' });
  });

  it('returns search-empty when query has no matches', () => {
    expect(
      deriveCatalogViewState({
        loading: false,
        isSearchSettling: false,
        error: null,
        visibleProducts: [],
        hasSearchQuery: true,
      }),
    ).toEqual({ state: 'empty', reason: 'no_search_results' });
  });

  it('returns category-empty when no query and no products', () => {
    expect(
      deriveCatalogViewState({
        loading: false,
        isSearchSettling: false,
        error: null,
        visibleProducts: [],
        hasSearchQuery: false,
      }),
    ).toEqual({ state: 'empty', reason: 'no_products' });
  });

  it('returns ready when products are visible', () => {
    const products = [product('1')];
    expect(
      deriveCatalogViewState({
        loading: false,
        isSearchSettling: false,
        error: null,
        visibleProducts: products,
        hasSearchQuery: true,
      }),
    ).toEqual({ state: 'ready', products });
  });

  it('returns error when fetch fails with no stale products', () => {
    expect(
      deriveCatalogViewState({
        loading: false,
        isSearchSettling: false,
        error: 'Network error',
        visibleProducts: [],
        hasSearchQuery: false,
      }),
    ).toEqual({ state: 'error', message: 'Network error', retryable: true });
  });
});
