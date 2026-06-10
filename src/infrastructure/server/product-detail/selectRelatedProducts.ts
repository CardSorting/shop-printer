import type { Product } from '@domain/models';
import { getServerServices } from '@infrastructure/server/services';
import {
  PRODUCT_DETAIL_RELATED_LIMIT,
  PRODUCT_DETAIL_RELATED_POOL,
} from './constants';

/**
 * Related products for PDP — server bootstrap only.
 */
export async function selectRelatedProducts(product: Product): Promise<Product[]> {
  const services = await getServerServices();

  try {
    const result = await services.productService.getProducts({
      category: product.category,
      limit: PRODUCT_DETAIL_RELATED_POOL,
    });
    return result.products.filter((p) => p.id !== product.id).slice(0, PRODUCT_DETAIL_RELATED_LIMIT);
  } catch {
    const fallback = await services.productService.getProducts({ limit: PRODUCT_DETAIL_RELATED_POOL });
    return fallback.products.filter((p) => p.id !== product.id).slice(0, PRODUCT_DETAIL_RELATED_LIMIT);
  }
}
