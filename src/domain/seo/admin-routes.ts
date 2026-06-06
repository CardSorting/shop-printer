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
