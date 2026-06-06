/**
 * [LAYER: CORE — SEO]
 * robots.txt policy composition.
 */

import {
  ROBOTS_DISALLOW_PREFIXES,
  ROBOTS_DISALLOW_QUERY_PATTERNS,
} from '@domain/seo/policies';
import type { SeoSiteConfig } from '@domain/seo/types';

export interface RobotsPolicy {
  sitemapUrl: string;
  host: string;
  disallow: readonly string[];
}

export class CrawlPolicyService {
  constructor(private readonly config: SeoSiteConfig) {}

  robotsPolicy(): RobotsPolicy {
    return {
      sitemapUrl: `${this.config.siteUrl}/sitemap.xml`,
      host: this.config.siteUrl,
      disallow: [...ROBOTS_DISALLOW_PREFIXES, ...ROBOTS_DISALLOW_QUERY_PATTERNS],
    };
  }
}
