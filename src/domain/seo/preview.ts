/**
 * [LAYER: DOMAIN — SEO]
 * Search & social preview models — familiar Google / Facebook / X patterns.
 */

export type SeoPreviewChannel = 'google' | 'social' | 'twitter';

export interface SeoGooglePreview {
  siteLabel: string;
  breadcrumb: string;
  title: string;
  description: string;
  url: string;
}

export interface SeoSocialPreview {
  siteLabel: string;
  title: string;
  description: string;
  imageUrl?: string;
  url: string;
}

export interface SeoTwitterPreview {
  siteLabel: string;
  title: string;
  description: string;
  imageUrl?: string;
  card: 'summary' | 'summary_large_image';
}

export interface SeoListingPreviewBundle {
  google: SeoGooglePreview;
  social: SeoSocialPreview;
  twitter: SeoTwitterPreview;
}

export interface SeoPreviewInput {
  name: string;
  description?: string;
  seoTitle?: string;
  seoDescription?: string;
  handle: string;
  pathPrefix: string;
  imageUrl?: string;
  siteName: string;
  siteHost: string;
}
