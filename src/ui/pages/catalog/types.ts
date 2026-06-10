import type { Product } from '@domain/models';

export type {
  CatalogCollectionInfo,
  CatalogPageProps,
} from '@infrastructure/server/catalog';

export type CatalogGridCols = 2 | 3 | 4;

/** Catalog product in view-state contracts. */
export type CatalogProduct = Product;

export type CatalogViewState =
  | { state: 'loading' }
  | { state: 'empty'; reason: 'no_products' | 'no_search_results' }
  | { state: 'ready'; products: CatalogProduct[] }
  | { state: 'error'; message: string; retryable: boolean };
