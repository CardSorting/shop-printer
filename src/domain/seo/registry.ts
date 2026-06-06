/**
 * [LAYER: DOMAIN — SEO]
 * Human-friendly page catalog for admin "Search & Visibility" navigation.
 */

export interface SeoPageCatalogEntry {
  id: string;
  label: string;
  description: string;
  path: string;
  audience: 'public' | 'private';
  category: 'storefront' | 'menu' | 'content' | 'support' | 'transactional';
}

export const SEO_PAGE_CATALOG: readonly SeoPageCatalogEntry[] = [
  {
    id: 'home',
    label: 'Homepage',
    description: 'Your main storefront — the first impression in Google.',
    path: '/',
    audience: 'public',
    category: 'storefront',
  },
  {
    id: 'menu',
    label: 'Vendors & Menu',
    description: 'Where people discover dishes and vendor counters.',
    path: '/products',
    audience: 'public',
    category: 'menu',
  },
  {
    id: 'visit',
    label: 'Visit & Connect',
    description: 'Hours, directions, private events, and FAQs.',
    path: '/support',
    audience: 'public',
    category: 'support',
  },
  {
    id: 'blog',
    label: 'Stories from the Hall',
    description: 'Vendor spotlights and community stories.',
    path: '/blog',
    audience: 'public',
    category: 'content',
  },
  {
    id: 'cart',
    label: 'Cart',
    description: 'Hidden from search — checkout path only.',
    path: '/cart',
    audience: 'private',
    category: 'transactional',
  },
  {
    id: 'checkout',
    label: 'Checkout',
    description: 'Hidden from search — private checkout flow.',
    path: '/checkout',
    audience: 'private',
    category: 'transactional',
  },
] as const;

export const SEO_ADMIN_RESOURCES = [
  {
    id: 'sitemap',
    label: 'Sitemap',
    description: 'A list of pages Google should crawl.',
    path: '/sitemap.xml',
  },
  {
    id: 'robots',
    label: 'Robots.txt',
    description: 'Instructions for search engine crawlers.',
    path: '/robots.txt',
  },
  {
    id: 'storefront',
    label: 'View online store',
    description: 'Open the customer-facing site in a new tab.',
    path: '/',
    external: false,
  },
] as const;
