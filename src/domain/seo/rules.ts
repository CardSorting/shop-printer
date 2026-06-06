/**
 * [LAYER: DOMAIN — SEO]
 * Pure SEO text and URL rules — no I/O, no framework dependencies.
 */

import {
  SITE_COMMUNITY_LINE,
  SITE_DESCRIPTION,
  SITE_GATHERING_LINE,
  SITE_MENU_LINE,
  WOODBINE_BRAND,
} from './brand';
import type { BlogPostSeoContext, ProductSeoContext, SeoSiteConfig } from './types';

export const SEO_DESCRIPTION_MAX_LENGTH = 160;

export function cleanSeoText(value?: string | null): string {
  return (value || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function clipSeoDescription(text: string, maxLength = SEO_DESCRIPTION_MAX_LENGTH): string {
  if (text.length <= maxLength) return text;
  const clipped = text.slice(0, maxLength + 1);
  const lastSpace = clipped.lastIndexOf(' ');
  return `${clipped.slice(0, lastSpace > 80 ? lastSpace : maxLength).trim()}...`;
}

export function seoDescription(
  value?: string | null,
  fallback = '',
  maxLength = SEO_DESCRIPTION_MAX_LENGTH
): string {
  const text = cleanSeoText(value) || cleanSeoText(fallback);
  return clipSeoDescription(text, maxLength);
}

export function buildDefaultSiteDescription(): string {
  return seoDescription(`${SITE_DESCRIPTION} ${SITE_GATHERING_LINE}`, SITE_COMMUNITY_LINE);
}

export function buildDefaultSiteTitle(): string {
  return `${WOODBINE_BRAND.name} | ${WOODBINE_BRAND.tagline}`;
}

export function canonicalPath(path: string): string {
  if (!path || path === '/') return '/';
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return cleanPath.replace(/\/+$/, '');
}

export function resolveAbsoluteUrl(siteUrl: string, pathOrUrl: string): string {
  try {
    return new URL(pathOrUrl, siteUrl).toString();
  } catch {
    return siteUrl;
  }
}

export function productPathFromHandle(handle: string, id?: string): string {
  return `/products/${handle || id}`;
}

export function productPathFromContext(product: Pick<ProductSeoContext, 'handle' | 'id'>): string {
  return productPathFromHandle(product.handle, product.id);
}

export function productSeoTitle(product: Pick<ProductSeoContext, 'seoTitle' | 'name'>): string {
  return product.seoTitle || product.name;
}

export function menuItemSeoDescription(
  product: ProductSeoContext,
  locality: string,
  siteName: string = WOODBINE_BRAND.name
): string {
  const vendor = product.vendor ? ` from ${product.vendor}` : '';
  const category = product.category ? ` — ${product.category} at the hall.` : '.';
  return seoDescription(
    product.seoDescription,
    `Order ${product.name}${vendor} at ${siteName}, a ${locality} food hall${category} ${SITE_MENU_LINE}`
  );
}

export function collectionSeoDescription(name: string, description?: string | null, siteName: string = WOODBINE_BRAND.name): string {
  return seoDescription(
    description,
    `Explore ${name} at ${siteName} — independent vendors, crowd favorites, and flavors from Salt Lake's neighborhood table under one restored warehouse roof.`
  );
}

export function blogPostSeoDescription(article: BlogPostSeoContext, locality: string): string {
  return seoDescription(
    article.metaDescription || article.excerpt,
    `Stories from WoodBine—vendor spotlights, community nights, and the people who make ${locality}'s neighborhood table worth returning to.`
  );
}

export function toIsoDate(value?: Date | string): string | undefined {
  if (!value) return undefined;
  if (value instanceof Date) return value.toISOString();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
}

export function priceFromCents(cents: number): string {
  return (cents / 100).toFixed(2);
}

export function resolveSocialTitle(
  title: string,
  siteName: string,
  titleAbsolute: boolean
): string {
  return titleAbsolute ? title : `${title} | ${siteName}`;
}

export function resolvePageTitle(
  title: string,
  titleAbsolute: boolean
): string | { absolute: string } {
  return titleAbsolute ? { absolute: title } : title;
}

export function geoMetaFromConfig(config: SeoSiteConfig): Record<string, string> {
  const meta: Record<string, string> = {
    'geo.region': `US-${config.region}`,
    'geo.placename': config.locality,
  };
  if (config.geoLat !== undefined && config.geoLng !== undefined) {
    meta['geo.position'] = `${config.geoLat};${config.geoLng}`;
    meta.ICBM = `${config.geoLat}, ${config.geoLng}`;
  }
  return meta;
}
