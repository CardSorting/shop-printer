import type { Product } from '@domain/models';

export type ProductDetail = Product;

export type ProductDetailPageProps = {
  product: Product;
  relatedProducts: Product[];
};

export type ProductDetailViewState =
  | { state: 'loading' }
  | { state: 'not_found' }
  | { state: 'unavailable'; reason: 'archived' | 'out_of_stock' }
  | { state: 'ready' };
