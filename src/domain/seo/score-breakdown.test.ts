import { describe, expect, it } from 'vitest';
import { buildScoreBreakdown } from './score-breakdown';
import type { CatalogSeoSummary } from './catalog';

const emptySummary = (): CatalogSeoSummary => ({
  total: 0,
  optimized: 0,
  needsWork: 0,
  averageScore: 0,
  items: [],
});

describe('domain/seo/score-breakdown', () => {
  it('combines site and listing metrics with hints', () => {
    const products: CatalogSeoSummary = {
      total: 2,
      optimized: 1,
      needsWork: 1,
      averageScore: 70,
      items: [],
    };
    const blogPosts: CatalogSeoSummary = {
      total: 1,
      optimized: 0,
      needsWork: 1,
      averageScore: 40,
      items: [],
    };

    const breakdown = buildScoreBreakdown(88, products, blogPosts);

    expect(breakdown.siteScore).toBe(88);
    expect(breakdown.listingAverage).toBe(60);
    expect(breakdown.needsWork).toBe(2);
    expect(breakdown.listingsTotal).toBe(3);
    expect(breakdown.siteTrafficLight.light).toBe('green');
    expect(breakdown.listingHint).toContain('2 listings');
  });

  it('falls back to site score when no listings exist', () => {
    const breakdown = buildScoreBreakdown(55, emptySummary(), emptySummary());
    expect(breakdown.listingAverage).toBe(55);
    expect(breakdown.listingHint).toContain('Add menu items');
  });
});
