import { permanentRedirect } from 'next/navigation';
import { buildProductDetailCacheKey, productDetailCacheTags } from './cacheKeys';
import { PRODUCT_DETAIL_CACHE_TTL_SECONDS } from './constants';
import { loadProductDetailBootstrap, serializeProductDetailBootstrap } from './loadProductDetailBootstrap';
import { resolveProductSlug } from './resolveProductSlug';
import { selectProductLcpImages } from './selectProductLcpImages';
import { selectProductSeo } from './selectProductSeo';
import { selectProductStructuredData } from './selectProductStructuredData';
import type { PreparedProductDetailPage, PreparedProductDetailPageResult } from './types';

/**
 * Storefront item read protocol entry point.
 * Routes prepare product detail data here — never assemble bootstrap locally.
 */
export async function prepareProductDetailPage(handle: string): Promise<PreparedProductDetailPageResult> {
  const resolved = await resolveProductSlug(handle);

  if (resolved.kind === 'not_found') {
    return { notFound: true, handle: resolved.handle };
  }

  if (resolved.kind === 'redirect') {
    permanentRedirect(resolved.canonicalPath);
  }

  const bootstrap = serializeProductDetailBootstrap(
    await loadProductDetailBootstrap(resolved.product),
  );

  const pageProps = {
    product: bootstrap.product,
    relatedProducts: bootstrap.relatedProducts,
  };

  const cacheKey = buildProductDetailCacheKey(resolved.handle);

  const prepared: PreparedProductDetailPage = {
    bootstrap,
    pageProps,
    seo: selectProductSeo(bootstrap.product),
    lcpImageUrls: selectProductLcpImages(bootstrap.product),
    jsonLd: selectProductStructuredData(bootstrap.product),
    displayName: bootstrap.product.name,
    handle: resolved.handle,
    cache: {
      key: cacheKey,
      ttl: PRODUCT_DETAIL_CACHE_TTL_SECONDS,
      tags: productDetailCacheTags(resolved.handle, bootstrap.product.category),
    },
  };

  return { notFound: false, ...prepared };
}
