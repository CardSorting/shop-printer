import type { Product } from '@domain/models';
import type { Metadata } from 'next';
import { productToSeoContext } from '@core/seo';
import { buildNextPageMetadata, getAppSeoEngine } from '@infrastructure/seo';
import { productImages, productPath } from '@utils/seo';
import type { Product } from '@domain/models';
import type { ProductSeo } from './types';

const seo = getAppSeoEngine();

export function selectProductSeoNotFound(handle: string): ProductSeo {
  return {
    metadata: buildNextPageMetadata(seo.pages.productNotFound(handle), seo.config),
    images: [],
  };
}

/** Canonical SEO selection for product detail routes. */
export function selectProductSeo(product: Product): ProductSeo {
  const input = seo.pages.product(productToSeoContext(product));
  const images = productImages(product);
  return {
    metadata: buildNextPageMetadata({ ...input, images }, seo.config),
    images,
  };
}

export function selectProductSeoMetadata(product: Product): Metadata {
  return selectProductSeo(product).metadata;
}

export function selectProductCanonicalPath(product: Product): string {
  return productPath(product);
}
