/**
 * [LAYER: CORE — SEO]
 * Listing and site-wide SEO health audits for admin surfaces.
 */

import {
  auditListingSeo,
  auditSiteSeo,
  suggestListingSeo,
  type ListingSeoInput,
  type SeoHealthResult,
  type SiteSeoAudit,
} from '@domain/seo/health';
import type { SeoSiteConfig } from '@domain/seo/types';

export class SeoHealthService {
  constructor(private readonly config: SeoSiteConfig) {}

  auditListing(input: ListingSeoInput): SeoHealthResult {
    return auditListingSeo(input);
  }

  suggestListing(input: ListingSeoInput): { seoTitle: string; seoDescription: string } {
    return suggestListingSeo(input, this.config.siteName);
  }

  auditSite(): SiteSeoAudit {
    return auditSiteSeo(this.config);
  }
}
