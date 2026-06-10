import type { Product } from '@domain/models';
import { sanitizeImageUrl } from '@utils/imageSanitizer';

/** LCP candidate count — first visible row only (single hero product image). */
export const CATALOG_LCP_PRELOAD_COUNT = 1;

/**
 * Selects stable LCP preload URLs from the first visible products in display order.
 * Never preloads the full catalog — only above-the-fold candidates.
 */
export function selectLcpImageUrls(
  products: Array<Pick<Product, 'imageUrl'>>,
  limit = CATALOG_LCP_PRELOAD_COUNT,
): string[] {
  const urls: string[] = [];
  const seen = new Set<string>();

  for (const product of products) {
    if (urls.length >= limit) break;
    const url = sanitizeImageUrl(product.imageUrl);
    if (seen.has(url)) continue;
    seen.add(url);
    urls.push(url);
  }

  return urls;
}
