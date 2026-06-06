/**
 * [LAYER: DOMAIN — SEO]
 * SEO setup guide progress — Shopify Setup Guide / GSC onboarding pattern.
 */

import type { SiteSeoAudit } from './health';
import { seoHubTabHref } from './onboarding';

export interface SeoSetupTask {
  id: string;
  label: string;
  description: string;
  done: boolean;
  href: string;
  priority: number;
}

export interface SeoSetupProgress {
  completedCount: number;
  totalCount: number;
  percent: number;
  tasks: SeoSetupTask[];
  nextTask: SeoSetupTask | null;
}

export interface SeoSetupProgressInput {
  siteAudit: SiteSeoAudit;
  combinedNeedsWork: number;
  hasListings: boolean;
}

export function buildSeoSetupProgress(input: SeoSetupProgressInput): SeoSetupProgress {
  const { siteAudit, combinedNeedsWork, hasListings } = input;

  const localCoreDone = ['locality', 'street', 'hours'].every(
    (id) => siteAudit.items.find((item) => item.id === id)?.done
  );
  const siteSecure = siteAudit.items.find((item) => item.id === 'site-url')?.done ?? false;
  const shareImageDone = siteAudit.items.find((item) => item.id === 'og-image')?.done ?? false;

  const tasks: SeoSetupTask[] = [
    {
      id: 'preview',
      label: 'Review your Google preview',
      description: 'See how WoodBine looks when someone searches your name.',
      done: siteAudit.score >= 50,
      href: seoHubTabHref('overview'),
      priority: 1,
    },
    {
      id: 'listings',
      label: 'Optimize search listings',
      description: 'Titles and descriptions for menu items, stories, collections, and help articles.',
      done: hasListings && combinedNeedsWork === 0,
      href: seoHubTabHref('listings'),
      priority: 2,
    },
    {
      id: 'local',
      label: 'Confirm local details',
      description: 'Address, hours, and phone for maps and “near me” searches.',
      done: localCoreDone,
      href: seoHubTabHref('local'),
      priority: 3,
    },
    {
      id: 'secure',
      label: 'Production website secured',
      description: 'HTTPS address so browsers and Google trust your site.',
      done: siteSecure,
      href: seoHubTabHref('local'),
      priority: 4,
    },
    {
      id: 'share',
      label: 'Default share image set',
      description: 'Photo shown when your homepage link is pasted on social.',
      done: shareImageDone,
      href: seoHubTabHref('local'),
      priority: 5,
    },
  ].sort((a, b) => a.priority - b.priority);

  const completedCount = tasks.filter((t) => t.done).length;
  const totalCount = tasks.length;
  const nextTask = tasks.find((t) => !t.done) ?? null;

  return {
    completedCount,
    totalCount,
    percent: totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0,
    tasks,
    nextTask,
  };
}
