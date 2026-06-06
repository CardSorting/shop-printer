import { describe, expect, it } from 'vitest';
import { auditListingSeo, auditSiteSeo, gradeLabel } from './health';
import type { SeoSiteConfig } from './types';

const baseConfig: SeoSiteConfig = {
  siteUrl: 'https://woodbine.com',
  siteName: 'WoodBine',
  tagline: 'Old Hall. New Flavors.',
  defaultOgImage: '/og-image.png',
  email: 'hello@woodbine.com',
  locality: 'Salt Lake City',
  region: 'UT',
  neighborhood: 'Salt Lake arts district',
  country: 'US',
  twitterHandle: '@WoodBine',
  socialProfiles: ['https://instagram.com/woodbine'],
};

describe('domain/seo/health', () => {
  it('scores optimized listings highly', () => {
    const result = auditListingSeo({
      name: 'Cold Brew Latte',
      description: 'Iced latte from our coffee counter.',
      seoTitle: 'Cold Brew Latte — Coffee Counter at WoodBine',
      seoDescription:
        'Order a cold brew latte at WoodBine food hall in Salt Lake City. A neighborhood favorite for laptop mornings and patio afternoons under the barrel roof.',
      handle: 'cold-brew-latte',
      imageUrl: '/menu/latte.jpg',
    });
    expect(result.score).toBeGreaterThanOrEqual(85);
    expect(result.grade).toBe('excellent');
  });

  it('flags missing SEO fields', () => {
    const result = auditListingSeo({ name: 'Tacos', description: 'Short.' });
    expect(result.score).toBeLessThan(70);
    expect(result.suggestions.length).toBeGreaterThan(0);
  });

  it('audits site config for local business completeness', () => {
    const sparse = auditSiteSeo(baseConfig);
    expect(sparse.score).toBeLessThan(100);

    const complete = auditSiteSeo({
      ...baseConfig,
      street: '123 Warehouse Way',
      phone: '801-555-0100',
      geoLat: 40.76,
      geoLng: -111.89,
      hoursOpens: '11:00',
      hoursCloses: '22:00',
      socialProfiles: ['https://instagram.com/woodbine', 'https://facebook.com/woodbine'],
    });
    expect(complete.score).toBeGreaterThan(sparse.score);
  });

  it('maps grades to friendly labels', () => {
    expect(gradeLabel('excellent')).toBe('Excellent');
    expect(gradeLabel('poor')).toBe('Getting started');
  });
});
