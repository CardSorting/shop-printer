import type { Product } from '@domain/models';
import type { JsonLd } from '@domain/seo/types';
import type { Metadata } from 'next';

export type ProductDetail = Product;

export type ProductDetailBootstrap = {
  product: Product;
  relatedProducts: Product[];
};

export type ProductSeo = {
  metadata: Metadata;
  images: string[];
};

/** Serializable props from server bootstrap → client product detail page. */
export type ProductDetailPageProps = {
  product: Product;
  relatedProducts: Product[];
};

export type PreparedProductDetailPage = {
  bootstrap: ProductDetailBootstrap;
  pageProps: ProductDetailPageProps;
  seo: ProductSeo;
  lcpImageUrls: string[];
  jsonLd: JsonLd[];
  displayName: string;
  handle: string;
  cache: {
    key: string;
    ttl: number;
    tags: string[];
  };
};

export type PreparedProductDetailPageResult =
  | (PreparedProductDetailPage & { notFound: false })
  | { notFound: true; handle: string };
