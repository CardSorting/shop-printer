import { MetadataRoute } from 'next';
import { getAppSeoEngine } from '@infrastructure/seo';

/**
 * Crawl directives — composed from centralized SEO crawl policy.
 */
export default function robots(): MetadataRoute.Robots {
  const policy = getAppSeoEngine().crawl.robotsPolicy();

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [...policy.disallow],
      },
    ],
    sitemap: policy.sitemapUrl,
    host: policy.host,
  };
}
