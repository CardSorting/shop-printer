/**
 * [LAYER: DOMAIN — SEO]
 * Crawl, index, and sitemap policies — single source of truth.
 */

export const NOINDEX_ROUTE_PREFIXES = [
  '/admin',
  '/account',
  '/checkout',
  '/cart',
  '/auth',
  '/orders',
  '/wishlist',
  '/api',
] as const;

export const ROBOTS_DISALLOW_PREFIXES = [
  '/admin/',
  '/account/',
  '/checkout/',
  '/cart/',
  '/api/',
  '/auth/',
  '/orders/',
  '/wishlist/',
] as const;

export const ROBOTS_DISALLOW_QUERY_PATTERNS = [
  '/*?sort_by=',
  '/*?min_price=',
  '/*?max_price=',
  '/*?condition=',
  '/*?availability=',
  '/*?category=',
  '/*?q=',
  '/*?page=',
] as const;

export interface SitemapStaticRoute {
  path: string;
  priority: number;
  changeFrequency: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  label: string;
  description: string;
}

export const SITEMAP_STATIC_ROUTES: readonly SitemapStaticRoute[] = [
  {
    path: '',
    priority: 1,
    changeFrequency: 'daily',
    label: 'Homepage',
    description: 'Main entry point for WoodBine food hall',
  },
  {
    path: '/products',
    priority: 0.95,
    changeFrequency: 'daily',
    label: 'Vendors & Menu',
    description: 'Full vendor and menu catalog',
  },
  {
    path: '/collections/all',
    priority: 0.9,
    changeFrequency: 'weekly',
    label: 'All Collections',
    description: 'Browse every menu grouping',
  },
  {
    path: '/support',
    priority: 0.85,
    changeFrequency: 'weekly',
    label: 'Visit & Connect',
    description: 'Hours, directions, and FAQs',
  },
  {
    path: '/blog',
    priority: 0.75,
    changeFrequency: 'weekly',
    label: 'Stories from the Hall',
    description: 'Community and vendor stories',
  },
] as const;

export const SITEMAP_PRIORITIES = {
  product: 0.7,
  collection: 0.65,
  blogPost: 0.6,
} as const;

export function shouldNoIndexPath(path: string): boolean {
  const normalized = path.split('?')[0] || '/';
  return NOINDEX_ROUTE_PREFIXES.some(
    (prefix) => normalized === prefix || normalized.startsWith(`${prefix}/`)
  );
}

export function pathHasFilterQuery(searchParams: Record<string, string | string[] | undefined>): boolean {
  return Object.keys(searchParams).length > 0;
}
