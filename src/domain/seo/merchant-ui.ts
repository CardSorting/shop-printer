/**
 * [LAYER: DOMAIN — SEO]
 * Merchant-facing copy — familiar Shopify / Google Search Console patterns, no jargon.
 */

export const SEO_MERCHANT_TERMS = {
  hubTitle: 'Search & Visibility',
  searchListing: 'Search engine listing',
  siteHealth: 'Site health',
  listingHealth: 'Listing health',
  quickWins: 'Quick wins',
  indexingStatus: 'Indexing status',
  googlePreview: 'Google preview',
  sitemap: 'Sitemap',
} as const;

/** Alert banner title when listings need attention */
export function listingAlertTitle(count: number): string {
  if (count <= 0) return 'All listings look good';
  return `${count} search listing${count === 1 ? '' : 's'} could rank better`;
}

/** Alert banner body — Shopify-style plain language */
export function listingAlertBody(count: number): string {
  if (count <= 0) {
    return 'Your menu items and stories have strong titles and descriptions for Google and social previews.';
  }
  return 'Add page titles and descriptions so Google and social previews look their best — same as editing a product in Shopify.';
}

/** Dashboard widget insight line */
export function widgetInsight(needsWork: number, topQuickWinTitle?: string): string {
  if (needsWork === 0) return 'Site basics and listings look healthy.';
  if (topQuickWinTitle) {
    return `Start with “${topQuickWinTitle}” for the fastest improvement.`;
  }
  return 'Some menu items or stories could use a stronger search listing.';
}

/** Sticky nudge when editing a single listing */
export function listingNudgeMessage(score: number, topFix?: string): string {
  if (score >= 65) return '';
  if (topFix) return topFix;
  if (score < 45) return 'Important search details are missing — open Search listing below.';
  return 'A stronger page title or description could help more people click from Google.';
}

/** Sidebar nav badge label */
export function navBadgeLabel(count: number): string {
  return String(count);
}
