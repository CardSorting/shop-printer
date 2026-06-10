import { PRODUCT_DETAIL_CACHE_TAGS } from './constants';

export function buildProductDetailCacheKey(handle: string): string {
  return JSON.stringify({ h: handle.trim().toLowerCase() });
}

export function productDetailCacheTags(handle: string, category?: string): string[] {
  const tags = [PRODUCT_DETAIL_CACHE_TAGS.product, PRODUCT_DETAIL_CACHE_TAGS.related];
  tags.push(`product-handle-${handle}`);
  if (category) tags.push(`product-category-${category.toLowerCase().replace(/\s+/g, '-')}`);
  return tags;
}
