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
}

export function buildIndexingSummary(): SeoIndexingSummary {
  const publicPages = SEO_PAGE_CATALOG.filter((p) => p.audience === 'public');
  const privatePages = SEO_PAGE_CATALOG.filter((p) => p.audience === 'private');
  const indexedCount = publicPages.length;
  const hiddenCount = privatePages.length;

  return {
    indexedCount,
    hiddenCount,
    indexedLabel: `${indexedCount} page${indexedCount === 1 ? '' : 's'} indexed`,
    hiddenLabel: `${hiddenCount} hidden on purpose`,
    merchantExplanation:
      'Indexed pages can appear in Google. Cart, checkout, and account stay private — the same approach Shopify uses.',
  };
}
