import type { Product } from '@domain/models';
import type { CatalogViewState } from './types';

type DeriveCatalogViewStateInput = {
  loading: boolean;
  isSearchSettling: boolean;
  error: string | null;
  visibleProducts: Product[];
  hasSearchQuery: boolean;
};

/**
 * Canonical catalog UI state machine.
 * Components must not invent loading/empty/error rules locally.
 */
export function deriveCatalogViewState({
  loading,
  isSearchSettling,
  error,
  visibleProducts,
  hasSearchQuery,
}: DeriveCatalogViewStateInput): CatalogViewState {
  if (error && visibleProducts.length === 0) {
    return { state: 'error', message: error, retryable: true };
  }

  if ((loading || isSearchSettling) && visibleProducts.length === 0) {
    return { state: 'loading' };
  }

  if (visibleProducts.length > 0) {
    return { state: 'ready', products: visibleProducts };
  }

  if (hasSearchQuery) {
    return { state: 'empty', reason: 'no_search_results' };
  }

  return { state: 'empty', reason: 'no_products' };
}
