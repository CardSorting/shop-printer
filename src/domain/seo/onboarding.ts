/**
 * [LAYER: DOMAIN — SEO]
 * Merchant onboarding tasks — Shopify Setup Guide style.
 */

export interface SeoOnboardingTask {
  id: string;
  title: string;
  description: string;
  href: string;
  cta: string;
  priority: number;
}

export const SEO_GETTING_STARTED_STEPS = [
  {
    step: 1,
    title: 'Check your homepage preview',
    body: 'See how WoodBine looks when someone finds you on Google.',
    tab: 'overview' as const,
  },
  {
    step: 2,
    title: 'Fix listings that need attention',
    body: 'Update titles and descriptions on menu items and stories.',
    tab: 'listings' as const,
  },
  {
    step: 3,
    title: 'Confirm local details',
    body: 'Address, hours, and phone help you show up on maps.',
    tab: 'local' as const,
  },
] as const;

export function seoHubTabHref(tab: string, guide?: string): string {
  const base = tab === 'overview' ? '/admin/seo' : `/admin/seo?tab=${tab}`;
  if (!guide) return base;
  return `${base}${base.includes('?') ? '&' : '?'}guide=${encodeURIComponent(guide)}`;
}

export const SEO_DISMISS_WELCOME_KEY = 'woodbine-seo-welcome-dismissed';
