/**
 * [LAYER: DOMAIN — SEO]
 * Human-readable sitemap coverage report for admin.
 */

import { SITEMAP_STATIC_ROUTES, SITEMAP_PRIORITIES } from './policies';

export interface SitemapCoverageRow {
  id: string;
  label: string;
  description: string;
  path: string;
  source: 'static' | 'products' | 'collections' | 'blog';
  priority: number;
  changeFrequency: string;
}

export function staticSitemapRows(): SitemapCoverageRow[] {
  return SITEMAP_STATIC_ROUTES.map((route) => ({
    id: `static-${route.path || 'home'}`,
    label: route.label,
    description: route.description,
    path: route.path || '/',
    source: 'static',
    priority: route.priority,
    changeFrequency: route.changeFrequency,
  }));
}

export function dynamicSitemapSummary(counts: {
  products: number;
  collections: number;
  blogPosts: number;
}): SitemapCoverageRow[] {
  return [
    {
      id: 'dynamic-products',
      label: 'Menu items',
      description: `Active products included automatically (${counts.products} live)`,
      path: '/products/*',
      source: 'products',
      priority: SITEMAP_PRIORITIES.product,
      changeFrequency: 'weekly',
    },
    {
      id: 'dynamic-collections',
      label: 'Collections',
      description: `Public collection pages (${counts.collections} live)`,
      path: '/collections/*',
      source: 'collections',
      priority: SITEMAP_PRIORITIES.collection,
      changeFrequency: 'weekly',
    },
    {
      id: 'dynamic-blog',
      label: 'Blog stories',
      description: `Published stories from the hall (${counts.blogPosts} live)`,
      path: '/blog/*',
      source: 'blog',
      priority: SITEMAP_PRIORITIES.blogPost,
      changeFrequency: 'monthly',
    },
  ];
}
