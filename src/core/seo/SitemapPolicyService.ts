/**
 * [LAYER: CORE — SEO]
 * Sitemap static route policy.
 */

import { SITEMAP_PRIORITIES, SITEMAP_STATIC_ROUTES } from '@domain/seo/policies';
import { resolveAbsoluteUrl } from '@domain/seo/rules';
import type { SeoSiteConfig } from '@domain/seo/types';

export class SitemapPolicyService {
  constructor(private readonly config: SeoSiteConfig) {}

  staticRoutes(now = new Date()) {
    return SITEMAP_STATIC_ROUTES.map((route) => ({
      url: resolveAbsoluteUrl(this.config.siteUrl, route.path || '/'),
      lastModified: now,
      changeFrequency: route.changeFrequency,
      priority: route.priority,
    }));
  }

  productRoute(path: string, updatedAt?: Date, now = new Date()) {
    return {
      url: resolveAbsoluteUrl(this.config.siteUrl, path),
      lastModified: updatedAt || now,
      changeFrequency: 'weekly' as const,
      priority: SITEMAP_PRIORITIES.product,
    };
  }

  collectionRoute(path: string, updatedAt?: Date, now = new Date()) {
    return {
      url: resolveAbsoluteUrl(this.config.siteUrl, path),
      lastModified: updatedAt || now,
      changeFrequency: 'weekly' as const,
      priority: SITEMAP_PRIORITIES.collection,
    };
  }

  blogPostRoute(path: string, updatedAt?: Date, now = new Date()) {
    return {
      url: resolveAbsoluteUrl(this.config.siteUrl, path),
      lastModified: updatedAt || now,
      changeFrequency: 'monthly' as const,
      priority: SITEMAP_PRIORITIES.blogPost,
    };
  }

  catalogEntries() {
    return SITEMAP_STATIC_ROUTES;
  }
}
