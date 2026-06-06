/**
 * [LAYER: CORE — SEO]
 * Aggregated admin SEO report — hub, dashboard, and API snapshot.
 */

import { buildQuickWins } from '@domain/seo/quickWins';
import { siteRecommendations, listingRecommendations } from '@domain/seo/recommendations';
import { staticSitemapRows, dynamicSitemapSummary } from '@domain/seo/sitemap-report';
import { SEO_EDIT_DESTINATIONS } from '@domain/seo/admin-routes';
import { trafficLightFromScore } from '@domain/seo/traffic-light';
import { buildScoreBreakdown, type SeoScoreBreakdown } from '@domain/seo/score-breakdown';
import { buildSeoSetupProgress, type SeoSetupProgress } from '@domain/seo/setup-progress';
import { buildIndexingSummary, type SeoIndexingSummary } from '@domain/seo/indexing-status';
import type { SeoSiteConfig } from '@domain/seo/types';
import type { SeoAdminSnapshot } from './CatalogAuditService';
import type { SiteSeoAudit } from '@domain/seo/health';
import { SeoHealthService } from './SeoHealthService';

export interface SeoAdminReport {
  site: SiteSeoAudit;
  snapshot: SeoAdminSnapshot;
  siteTrafficLight: ReturnType<typeof trafficLightFromScore>;
  siteRecommendations: ReturnType<typeof siteRecommendations>;
  quickWins: ReturnType<typeof buildQuickWins>;
  editDestinations: typeof SEO_EDIT_DESTINATIONS;
  sitemap: {
    static: ReturnType<typeof staticSitemapRows>;
    dynamic: ReturnType<typeof dynamicSitemapSummary>;
    totalEstimatedUrls: number;
  };
  scoreBreakdown: SeoScoreBreakdown;
  setupProgress: SeoSetupProgress;
  indexing: SeoIndexingSummary;
}

export class SeoAdminReportService {
  private readonly health: SeoHealthService;

  constructor(config: SeoSiteConfig) {
    this.health = new SeoHealthService(config);
  }

  buildReport(snapshot: SeoAdminSnapshot, counts: { products: number; collections: number; blogPosts: number }): SeoAdminReport {
    const site = this.health.auditSite();
    const listingItems = [
      ...snapshot.products.items,
      ...snapshot.blogPosts.items,
      ...snapshot.collections.items,
    ];
    const staticRows = staticSitemapRows();
    const dynamicRows = dynamicSitemapSummary(counts);

    return {
      site,
      snapshot,
      siteTrafficLight: trafficLightFromScore(site.score),
      siteRecommendations: siteRecommendations(site.items),
      quickWins: buildQuickWins(listingItems, 5),
      editDestinations: SEO_EDIT_DESTINATIONS,
      sitemap: {
        static: staticRows,
        dynamic: dynamicRows,
        totalEstimatedUrls: staticRows.length + counts.products + counts.collections + counts.blogPosts,
      },
      scoreBreakdown: buildScoreBreakdown(
        site.score,
        snapshot.products,
        snapshot.blogPosts,
        snapshot.collections
      ),
      setupProgress: buildSeoSetupProgress({
        siteAudit: site,
        combinedNeedsWork: snapshot.combinedNeedsWork,
        hasListings:
          snapshot.products.total + snapshot.blogPosts.total + snapshot.collections.total > 0,
      }),
      indexing: buildIndexingSummary(),
    };
  }

  auditListingForKind(
    input: Parameters<SeoHealthService['auditListing']>[0],
    kind: 'product' | 'blog' | 'collection' | 'homepage'
  ) {
    const health = this.health.auditListing(input);
    return {
      health,
      trafficLight: trafficLightFromScore(health.score),
      recommendations: listingRecommendations(input, kind),
      suggested: this.health.suggestListing(input),
    };
  }
}
