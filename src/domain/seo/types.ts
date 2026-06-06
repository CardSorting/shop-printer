/**
 * [LAYER: DOMAIN — SEO]
 * Pure SEO value types and contracts. No I/O, no framework imports.
 */

export type JsonLd = Record<string, unknown>;

export type SeoPageType = 'website' | 'article';

export interface SeoSiteConfig {
  siteUrl: string;
  siteName: string;
  tagline: string;
  defaultOgImage: string;
  email: string;
  locality: string;
  region: string;
  neighborhood: string;
  country: string;
  street?: string;
  postal?: string;
  phone?: string;
  geoLat?: number;
  geoLng?: number;
  hoursOpens?: string;
  hoursCloses?: string;
  twitterHandle: string;
  socialProfiles: readonly string[];
}

export interface BreadcrumbItem {
  name: string;
  path: string;
}

export interface ListItemRef {
  name: string;
  path: string;
}

export interface FaqEntry {
  question: string;
  answer: string;
}

export interface SeoPageMetadataInput {
  title: string;
  description: string;
  path: string;
  keywords?: readonly string[];
  images?: string[];
  type?: SeoPageType;
  noIndex?: boolean;
  titleAbsolute?: boolean;
  publishedTime?: string;
  modifiedTime?: string;
  authors?: string[];
}

export interface OgImageDescriptor {
  url: string;
  width: number;
  height: number;
  alt: string;
}

export interface ResolvedSeoPageMetadata {
  title: string | { absolute: string };
  description: string;
  keywords: string[];
  canonical: string;
  socialTitle: string;
  ogImages: OgImageDescriptor[];
  resolvedImageUrls: string[];
  type: SeoPageType;
  noIndex: boolean;
  publishedTime?: string;
  modifiedTime?: string;
  authors?: string[];
}

export interface ProductSeoContext {
  handle: string;
  id: string;
  name: string;
  seoTitle?: string;
  seoDescription?: string;
  vendor?: string;
  category?: string;
  price: number;
  stock: number;
  sku?: string;
  manufacturerSku?: string;
  imageUrl?: string;
  mediaUrls?: string[];
  variantImageUrls?: string[];
  hasVariants?: boolean;
  options?: Array<{ name: string }>;
  variants?: Array<{
    id: string;
    title?: string;
    sku?: string;
    price: number;
    stock: number;
    imageUrl?: string;
    option1?: string;
    option2?: string;
    option3?: string;
  }>;
  metafields?: Record<string, unknown>;
  averageRating?: number;
  reviewCount?: number;
}

export interface BlogPostSeoContext {
  slug: string;
  title: string;
  excerpt: string;
  metaTitle?: string;
  metaDescription?: string;
  ogTitle?: string;
  ogImage?: string;
  featuredImageUrl?: string;
  authorName?: string;
  tags?: string[];
  publishedAt?: Date | string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export type SeoKeywordSet = 'global' | 'menu' | 'visit' | 'blog';
