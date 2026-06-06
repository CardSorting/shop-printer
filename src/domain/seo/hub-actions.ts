/**
 * [LAYER: DOMAIN — SEO]
 * Shared hub navigation actions — single map for sidebar, command palette, and dashboards.
 */

import { seoHubTabHref } from './onboarding';

export interface SeoHubAction {
  id: string;
  label: string;
  description: string;
  href: string;
  keywords: string[];
}

export const SEO_HUB_ACTIONS: readonly SeoHubAction[] = [
  {
    id: 'seo-overview',
    label: 'Search & Visibility overview',
    description: 'Site health, Google preview, and setup progress',
    href: seoHubTabHref('overview'),
    keywords: ['seo', 'overview', 'health', 'dashboard', 'visibility'],
  },
  {
    id: 'seo-fix-listings',
    label: 'Fix search listings',
    description: 'Menu items, collections, and stories that need better titles',
    href: seoHubTabHref('listings'),
    keywords: ['seo', 'listings', 'meta', 'google', 'products', 'blog'],
  },
  {
    id: 'seo-local',
    label: 'Check local presence',
    description: 'Address, hours, and map listing checklist',
    href: seoHubTabHref('local'),
    keywords: ['local', 'maps', 'google business', 'address', 'hours'],
  },
  {
    id: 'seo-learn',
    label: 'Learn about search visibility',
    description: 'Plain-language guides for non-technical merchants',
    href: seoHubTabHref('learn'),
    keywords: ['help', 'guide', 'tutorial', 'learn', 'what is seo'],
  },
  {
    id: 'seo-help-articles',
    label: 'Fix help center listings',
    description: 'Visit & Connect articles for hours, directions, and FAQs',
    href: '/admin/seo?tab=listings',
    keywords: ['help', 'support', 'visit', 'faq', 'articles'],
  },
  {
    id: 'seo-sitemap',
    label: 'View sitemap',
    description: 'Every page Google can crawl on your site',
    href: '/sitemap.xml',
    keywords: ['sitemap', 'xml', 'crawl', 'index'],
  },
] as const;
