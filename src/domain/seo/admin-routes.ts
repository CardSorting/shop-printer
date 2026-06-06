/**
 * [LAYER: DOMAIN — SEO]
 * Where merchants edit SEO — single map for hub links and onboarding.
 */

export interface SeoEditDestination {
  id: string;
  label: string;
  description: string;
  href: string;
  hubTab?: string;
}

export const SEO_EDIT_DESTINATIONS: readonly SeoEditDestination[] = [
  {
    id: 'products',
    label: 'Menu items',
    description: 'Open any product → Search engine listing',
    href: '/admin/products',
    hubTab: 'listings',
  },
  {
    id: 'blog',
    label: 'Stories',
    description: 'Blog editor → SEO tab on each story',
    href: '/admin/blog',
    hubTab: 'listings',
  },
  {
    id: 'collections',
    label: 'Collections & categories',
    description: 'Taxonomy → edit category → Search engine listing',
    href: '/admin/taxonomy',
    hubTab: 'listings',
  },
  {
    id: 'merch-collections',
    label: 'Merchandising collections',
    description: 'Create collection → Search engine listing section',
    href: '/admin/collections',
    hubTab: 'listings',
  },
  {
    id: 'visit',
    label: 'Visit & Connect',
    description: 'Help center articles for hours, directions, and FAQs.',
    href: '/admin/support',
    hubTab: 'listings',
  },
  {
    id: 'settings',
    label: 'Store settings',
    description: 'Business name, address, and contact (via deployment env)',
    href: '/admin/settings',
    hubTab: 'local',
  },
  {
    id: 'navigation',
    label: 'Storefront menu',
    description: 'Mega-menu links customers use to browse',
    href: '/admin/settings/navigation',
  },
] as const;

export function seoHubLearnHref(topic?: string): string {
  return topic ? `/admin/seo?tab=learn` : '/admin/seo?tab=learn';
}

/** Deep link into taxonomy editor for a category row from the SEO hub */
export function taxonomyCategoryEditHref(categoryId: string): string {
  return `/admin/taxonomy?edit=${encodeURIComponent(categoryId)}`;
}

/** Admin editor for Visit & Connect help articles */
export function helpArticleEditHref(articleId: string): string {
  return `/admin/blog/${encodeURIComponent(articleId)}`;
}

/** Help center list with Needs SEO filter */
export function adminHelpSeoFilterHref(): string {
  return adminListSeoFilterHref('/admin/support');
}

/** Append Needs SEO filter to admin list routes (products, blog, collections, taxonomy) */
export function adminListSeoFilterHref(basePath: string): string {
  const separator = basePath.includes('?') ? '&' : '?';
  return `${basePath}${separator}seo=needs-work`;
}

export function parseSeoNeedsWorkFilter(
  searchParams: Pick<URLSearchParams, 'get'> | { get: (key: string) => string | null }
): boolean {
  return searchParams.get('seo') === 'needs-work';
}
