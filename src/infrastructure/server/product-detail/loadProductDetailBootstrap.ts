import type { Product } from '@domain/models';
import { selectRelatedProducts } from './selectRelatedProducts';
import type { ProductDetailBootstrap } from './types';

export async function loadProductDetailBootstrap(product: Product): Promise<ProductDetailBootstrap> {
  const relatedProducts = await selectRelatedProducts(product);

  return {
    product,
    relatedProducts,
  };
}

export function serializeProductDetailBootstrap(bootstrap: ProductDetailBootstrap): ProductDetailBootstrap {
  return JSON.parse(JSON.stringify(bootstrap)) as ProductDetailBootstrap;
}
