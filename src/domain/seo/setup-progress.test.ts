import { describe, expect, it } from 'vitest';
import { buildSeoSetupProgress } from './setup-progress';
import { auditSiteSeo } from './health';
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
  street: '123 Main St',
  phone: '801-555-0100',
  hoursOpens: '11:00',
  hoursCloses: '21:00',
  twitterHandle: '@WoodBine',
  socialProfiles: ['https://instagram.com/woodbine', 'https://facebook.com/woodbine'],
};

describe('domain/seo/setup-progress', () => {
  it('tracks completed setup tasks', () => {
    const siteAudit = auditSiteSeo(baseConfig);
    const progress = buildSeoSetupProgress({
      siteAudit,
      combinedNeedsWork: 0,
      hasListings: true,
    });

    expect(progress.totalCount).toBe(5);
    expect(progress.completedCount).toBeGreaterThan(0);
    expect(progress.percent).toBeGreaterThan(0);
    expect(progress.nextTask).toBeNull();
  });

  it('surfaces next task when listings need work', () => {
    const siteAudit = auditSiteSeo({ ...baseConfig, street: '', hoursOpens: '', hoursCloses: '' });
    const progress = buildSeoSetupProgress({
      siteAudit,
      combinedNeedsWork: 3,
      hasListings: true,
    });

    expect(progress.nextTask?.id).toBe('listings');
    expect(progress.tasks.find((t) => t.id === 'local')?.done).toBe(false);
  });
});
