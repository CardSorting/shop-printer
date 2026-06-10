import type { Product } from '@domain/models';
import { sanitizeImageUrl } from '@utils/imageSanitizer';
import { PRODUCT_DETAIL_LCP_PRELOAD_COUNT } from './constants';

/**
 * LCP preload — primary product image only.
 */
export function selectProductLcpImages(
  product: Pick<Product, 'imageUrl'>,
  limit = PRODUCT_DETAIL_LCP_PRELOAD_COUNT,
): string[] {
  const url = sanitizeImageUrl(product.imageUrl);
  return limit > 0 ? [url] : [];
}
