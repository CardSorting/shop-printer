/**
 * Product detail server module — storefront item read protocol.
 *
 * Routes import only from here. Never call loadProductDetailBootstrap directly.
 */
export type {
  ProductDetail,
  ProductDetailBootstrap,
  ProductDetailPageProps,
  ProductSeo,
  PreparedProductDetailPage,
  PreparedProductDetailPageResult,
} from './types';
export type { ResolvedProductSlug } from './resolveProductSlug';

export {
  PRODUCT_DETAIL_RELATED_LIMIT,
  PRODUCT_DETAIL_CACHE_TTL_SECONDS,
  PRODUCT_DETAIL_LCP_PRELOAD_COUNT,
  PRODUCT_DETAIL_CACHE_TAGS,
} from './constants';
export { buildProductDetailCacheKey, productDetailCacheTags } from './cacheKeys';
export { resolveProductSlug } from './resolveProductSlug';
export { selectProductLcpImages } from './selectProductLcpImages';
export {
  selectProductSeo,
  selectProductSeoNotFound,
  selectProductSeoMetadata,
  selectProductCanonicalPath,
} from './selectProductSeo';
export { selectRelatedProducts } from './selectRelatedProducts';
export { selectProductStructuredData } from './selectProductStructuredData';
export {
  loadProductDetailBootstrap,
  serializeProductDetailBootstrap,
} from './loadProductDetailBootstrap';
export { prepareProductDetailPage } from './prepareProductDetailPage';
