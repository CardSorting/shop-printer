/**
 * [LAYER: DOMAIN — SEO]
 * Site vs. listing score breakdown — Google Search Console / Yoast dual-metric pattern.
 */

import type { CatalogSeoSummary } from './catalog';
import { trafficLightFromScore, type SeoTrafficLightState } from './traffic-light';

export interface SeoScoreBreakdown {
  siteScore: number;
  listingAverage: number;
  listingsOptimized: number;
  listingsTotal: number;
  needsWork: number;
  siteTrafficLight: SeoTrafficLightState;
  listingTrafficLight: SeoTrafficLightState;
  siteHint: string;
  listingHint: string;
}

export function buildScoreBreakdown(
  siteScore: number,
  products: CatalogSeoSummary,
  blogPosts: CatalogSeoSummary,
  collections: CatalogSeoSummary = { total: 0, optimized: 0, needsWork: 0, averageScore: 0, items: [] },
  helpArticles: CatalogSeoSummary = { total: 0, optimized: 0, needsWork: 0, averageScore: 0, items: [] }
): SeoScoreBreakdown {
  const listingsTotal = products.total + blogPosts.total + collections.total + helpArticles.total;
  const listingsOptimized =
    products.optimized + blogPosts.optimized + collections.optimized + helpArticles.optimized;
  const needsWork =
    products.needsWork + blogPosts.needsWork + collections.needsWork + helpArticles.needsWork;

  const listingAverage =
    listingsTotal === 0
      ? 0
      : Math.round(
          (products.averageScore * products.total +
            blogPosts.averageScore * blogPosts.total +
            collections.averageScore * collections.total +
            helpArticles.averageScore * helpArticles.total) /
            listingsTotal
        );

  const effectiveListingScore = listingsTotal === 0 ? siteScore : listingAverage;

  return {
    siteScore,
    listingAverage: effectiveListingScore,
    listingsOptimized,
    listingsTotal,
    needsWork,
    siteTrafficLight: trafficLightFromScore(siteScore),
    listingTrafficLight: trafficLightFromScore(effectiveListingScore),
    siteHint:
      siteScore >= 65
        ? 'Site-wide basics (business name, hours, address) look trustworthy to Google.'
        : 'Complete address, hours, and contact details so local search can recommend WoodBine.',
    listingHint:
      needsWork === 0
        ? listingsTotal === 0
          ? 'Add menu items, collections, or stories — each gets its own search listing.'
          : 'Menu items, collections, stories, and help articles have strong search listings.'
        : `${needsWork} listing${needsWork === 1 ? '' : 's'} would benefit from title or description edits.`,
  };
}
