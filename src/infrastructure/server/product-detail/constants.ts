export const PRODUCT_DETAIL_RELATED_LIMIT = 4;
export const PRODUCT_DETAIL_RELATED_POOL = 5;
export const PRODUCT_DETAIL_CACHE_TTL_SECONDS = 120;
export const PRODUCT_DETAIL_LCP_PRELOAD_COUNT = 1;

export const PRODUCT_DETAIL_CACHE_TAGS = {
  product: 'product-detail',
  related: 'product-detail-related',
} as const;
