/**
 * [FACADE] WoodBine SEO public API
 *
 * Backward-compatible surface for UI and App Router pages.
 * Implementation lives in domain/seo, core/seo, and infrastructure/seo.
 */

import type { Metadata } from 'next';
import type { KnowledgebaseArticle, Product } from '@domain/models';
import { articleToSeoContext, productToSeoContext } from '@core/seo';
import { getAppSeoEngine, buildNextPageMetadata, getSeoConfig } from '@infrastructure/seo';
import {
  SITE_BELONGING_LINE,
  SITE_CART_EMPTY_LINE,
  SITE_COMMUNITY_HEADLINE,
  SITE_COMMUNITY_LINE,
  SITE_CTA,
  SITE_DESCRIPTION,
  SITE_FOOTER_CLOSER,
  SITE_GATHERING_LINE,
  SITE_MENU_LINE,
  SITE_NEWSLETTER_LINE,
  SITE_ROOM_ESSENCE,
  SITE_VENDOR_LINE,
  SEO_ELEVATOR_PITCH,
  WOODBINE_BRAND,
} from '@domain/seo/brand';
import {
  CART_GUEST_TIERS,
  COMMUNITY_CHIPS,
  COMMUNITY_PILLARS,
  COMMUNITY_RITUALS,
  ROOM_VOICES,
  SITE_COMMUNITY_PROMISE,
} from '@domain/seo/community';
import {
  SEO_KEYWORDS_BLOG,
  SEO_KEYWORDS_GLOBAL,
  SEO_KEYWORDS_MENU,
  SEO_KEYWORDS_VISIT,
} from '@domain/seo/keywords';
import {
  blogPostSeoDescription as resolveBlogPostDescription,
  buildDefaultSiteDescription,
  buildDefaultSiteTitle,
  cleanSeoText,
  collectionSeoDescription,
  menuItemSeoDescription as resolveMenuItemDescription,
  productPathFromContext,
  productSeoTitle,
  seoDescription,
  toIsoDate,
} from '@domain/seo/rules';
import type { FaqEntry, JsonLd, SeoPageMetadataInput } from '@domain/seo/types';
import { sanitizeImageUrl } from './imageSanitizer';

const seo = () => getAppSeoEngine();
const config = () => getSeoConfig();

// ── Brand & community (UI copy) ──────────────────────────────────────────────

export const SITE_URL = config().siteUrl;
export const SITE_NAME = WOODBINE_BRAND.name;
export const SITE_TAGLINE = WOODBINE_BRAND.tagline;
export const DEFAULT_OG_IMAGE = WOODBINE_BRAND.defaultOgImage;

export {
  SITE_BELONGING_LINE,
  SITE_CART_EMPTY_LINE,
  SITE_COMMUNITY_HEADLINE,
  SITE_COMMUNITY_LINE,
  SITE_CTA,
  SITE_DESCRIPTION,
  SITE_FOOTER_CLOSER,
  SITE_GATHERING_LINE,
  SITE_MENU_LINE,
  SITE_NEWSLETTER_LINE,
  SITE_ROOM_ESSENCE,
  SITE_VENDOR_LINE,
  SEO_ELEVATOR_PITCH,
  SITE_COMMUNITY_PROMISE,
  COMMUNITY_RITUALS,
  CART_GUEST_TIERS,
  COMMUNITY_PILLARS,
  ROOM_VOICES,
  COMMUNITY_CHIPS,
};

// ── Local SEO env-backed values ──────────────────────────────────────────────

export const SITE_LOCALITY = config().locality;
export const SITE_REGION = config().region;
export const SITE_NEIGHBORHOOD = config().neighborhood;
export const SITE_COUNTRY = config().country;
export const SITE_GEO_LAT = config().geoLat?.toString();
export const SITE_GEO_LNG = config().geoLng?.toString();
export const SITE_STREET = config().street;
export const SITE_POSTAL = config().postal;
export const SITE_PHONE = config().phone;
export const SITE_HOURS_OPENS = config().hoursOpens;
export const SITE_HOURS_CLOSES = config().hoursCloses;

// ── Keywords ─────────────────────────────────────────────────────────────────

export const SEO_KEYWORDS = SEO_KEYWORDS_GLOBAL;
export { SEO_KEYWORDS_MENU, SEO_KEYWORDS_VISIT, SEO_KEYWORDS_BLOG };

export const SEO_DEFAULT_TITLE = buildDefaultSiteTitle();
export const SEO_DEFAULT_DESCRIPTION = buildDefaultSiteDescription();

export const VISIT_FAQS = seo().visitFaqs();

// ── Pure helpers ─────────────────────────────────────────────────────────────

export {
  cleanSeoText,
  seoDescription,
  collectionSeoDescription,
  productSeoTitle,
  toIsoDate,
};

export function absoluteUrl(pathOrUrl: string): string {
  return seo().absoluteUrl(pathOrUrl);
}

export function canonicalPath(path: string): string {
  return seo().canonical(path);
}

export function productPath(product: Product): string {
  return productPathFromContext(productToSeoContext(product));
}

export function productSeoDescription(product: Product): string {
  return resolveMenuItemDescription(productToSeoContext(product), SITE_LOCALITY, SITE_NAME);
}

export function menuItemSeoDescription(product: Product): string {
  return resolveMenuItemDescription(productToSeoContext(product), SITE_LOCALITY, SITE_NAME);
}

export function productImages(product: Product): string[] {
  const ctx = productToSeoContext(product);
  const urls = [ctx.imageUrl, ...(ctx.mediaUrls || []), ...(ctx.variantImageUrls || [])].filter(
    (url): url is string => Boolean(url)
  );
  return Array.from(new Set(urls)).map((url) => absoluteUrl(sanitizeImageUrl(url)));
}

function resolveImage(url: string): string {
  return sanitizeImageUrl(url);
}

// ── Structured data ──────────────────────────────────────────────────────────

export function breadcrumbJsonLd(items: Array<{ name: string; path: string }>): JsonLd {
  return seo().structured.breadcrumb(items);
}

export function organizationJsonLd(): JsonLd {
  return seo().structured.organization();
}

export function foodEstablishmentJsonLd(): JsonLd {
  return seo().structured.foodEstablishment();
}

export function webSiteJsonLd(): JsonLd {
  return seo().structured.webSite();
}

export function homePageJsonLd(): JsonLd {
  return seo().structured.homePageGraph();
}

export function itemListJsonLd(name: string, path: string, items: Array<{ name: string; path: string }>): JsonLd {
  return seo().structured.itemList(name, path, items);
}

export function faqPageJsonLd(faqs: ReadonlyArray<FaqEntry>): JsonLd {
  return seo().structured.faqPage(faqs);
}

export function howToVisitJsonLd(): JsonLd {
  return seo().structured.howToVisit();
}

export function blogIndexJsonLd(): JsonLd {
  return seo().structured.blogIndex();
}

export function blogPostSeoDescription(article: KnowledgebaseArticle): string {
  return resolveBlogPostDescription(articleToSeoContext(article), SITE_LOCALITY);
}

export function blogArticleJsonLd(article: KnowledgebaseArticle, authorName?: string): JsonLd {
  return seo().structured.blogArticle(articleToSeoContext(article), authorName);
}

export function helpArticleJsonLd(article: KnowledgebaseArticle): JsonLd {
  return seo().structured.helpArticle(articleToSeoContext(article));
}

export function productJsonLd(product: Product): JsonLd {
  return seo().structured.product(productToSeoContext(product), resolveImage);
}

export function menuItemJsonLd(product: Product): JsonLd {
  return seo().structured.menuItem(productToSeoContext(product), resolveImage);
}

export function defaultOgImages(customUrl?: string) {
  return seo().pages.defaultOgImages(customUrl);
}

// ── Next.js metadata ─────────────────────────────────────────────────────────

export function buildPageMetadata(input: SeoPageMetadataInput): Metadata {
  return buildNextPageMetadata(input, config());
}
