/**
 * [LAYER: DOMAIN — SEO]
 * Indexing status summary — Google Search Console “Pages” pattern for merchants.
 */

import { SEO_PAGE_CATALOG } from './registry';

export interface SeoIndexingSummary {
  indexedCount: number;
  hiddenCount: number;
  indexedLabel: string;
  hiddenLabel: string;
  merchantExplanation: string;
  /** Estimated crawlable URLs from sitemap (when provided) */
  estimatedSitemapUrls?: number;
}

export function buildIndexingSummary(options?: { estimatedSitemapUrls?: number }): SeoIndexingSummary {
  const publicPages = SEO_PAGE_CATALOG.filter((p) => p.audience === 'public');
  const privatePages = SEO_PAGE_CATALOG.filter((p) => p.audience === 'private');
  const indexedCount = publicPages.length;
  const hiddenCount = privatePages.length;
  const sitemapNote = options?.estimatedSitemapUrls
    ? ` Your sitemap lists about ${options.estimatedSitemapUrls} URLs including menu items and stories.`
    : '';

  return {
    indexedCount,
    hiddenCount,
    estimatedSitemapUrls: options?.estimatedSitemapUrls,
    indexedLabel: options?.estimatedSitemapUrls
      ? `~${options.estimatedSitemapUrls} URLs in sitemap`
      : `${indexedCount} page${indexedCount === 1 ? '' : 's'} indexed`,
    hiddenLabel: `${hiddenCount} hidden on purpose`,
    merchantExplanation:
      `Indexed pages can appear in Google. Cart, checkout, account, and sign-in stay private — the same approach Shopify uses.${sitemapNote}`,
  };
}
