import { cache } from 'react';
import { getServerServices } from '@infrastructure/server/services';
import type { Product } from '@domain/models';
import { productPath } from '@utils/seo';

export type ResolvedProductSlug =
  | { kind: 'found'; product: Product; handle: string }
  | { kind: 'not_found'; handle: string }
  | { kind: 'redirect'; canonicalPath: string; handle: string; product: Product };

/**
 * Dedupes product resolution within a single request (metadata + page).
 */
export const resolveProductSlug = cache(async (handle: string): Promise<ResolvedProductSlug> => {
  const services = await getServerServices();

  try {
    const product = await services.productService.getProductByHandle(handle);
    if (product.handle && product.handle !== handle) {
      return { kind: 'redirect', canonicalPath: productPath(product), handle, product };
    }
    return { kind: 'found', product, handle };
  } catch {
    try {
      const product = await services.productService.getProduct(handle);
      if (product.handle && product.handle !== handle) {
        return { kind: 'redirect', canonicalPath: productPath(product), handle, product };
      }
      return { kind: 'found', product, handle };
    } catch {
      return { kind: 'not_found', handle };
    }
  }
});
