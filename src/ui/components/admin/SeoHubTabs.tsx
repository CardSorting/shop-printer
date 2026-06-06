'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import type { SeoHubTabId } from '@domain/seo/guides';
import { SEO_HUB_TABS } from '@domain/seo/guides';
import { seoHubTabHref } from '@domain/seo/onboarding';

function parseTab(value: string | null): SeoHubTabId {
  const valid: SeoHubTabId[] = ['overview', 'listings', 'local', 'learn'];
  return valid.includes(value as SeoHubTabId) ? (value as SeoHubTabId) : 'overview';
}

export interface SeoHubTabCounts {
  listings?: number;
  localIncomplete?: number;
  /** Setup progress 0–100; shown on Overview tab when below 100 */
  setupPercent?: number;
}

/** URL-driven tabs with optional count badges — Shopify notification pattern */
export function SeoHubTabs({ counts }: { counts?: SeoHubTabCounts }) {
  const searchParams = useSearchParams();
  const active = parseTab(searchParams.get('tab'));

  function badgeFor(tabId: SeoHubTabId): number | undefined {
    if (tabId === 'listings' && counts?.listings) return counts.listings;
    if (tabId === 'local' && counts?.localIncomplete) return counts.localIncomplete;
    if (tabId === 'overview' && counts?.setupPercent !== undefined && counts.setupPercent < 100) {
      return counts.setupPercent;
    }
    return undefined;
  }

  function badgeTone(tabId: SeoHubTabId): string {
    if (tabId === 'overview' && counts?.setupPercent !== undefined && counts.setupPercent < 100) {
      return 'bg-primary-100 text-primary-800';
    }
    return 'bg-amber-100 text-amber-800';
  }

  return (
    <nav className="flex flex-wrap gap-1 rounded-xl border bg-gray-50/80 p-1" aria-label="Search and visibility sections">
      {SEO_HUB_TABS.map((tab) => {
        const badge = badgeFor(tab.id);
        return (
          <Link
            key={tab.id}
            href={seoHubTabHref(tab.id)}
            className={`relative rounded-lg px-4 py-2.5 text-left transition ${
              active === tab.id
                ? 'bg-white text-gray-900 shadow-sm ring-1 ring-black/5'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            <span className="flex items-center gap-2">
              <span className="block text-xs font-bold">{tab.label}</span>
              {badge !== undefined && (
                (tab.id === 'overview' &&
                  counts?.setupPercent !== undefined &&
                  counts.setupPercent < 100) ||
                (tab.id !== 'overview' && badge > 0)
              ) && (
                <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-black ${badgeTone(tab.id)}`}>
                  {tab.id === 'overview' && counts?.setupPercent !== undefined && counts.setupPercent < 100
                    ? `${badge}%`
                    : badge}
                </span>
              )}
            </span>
            <span className="hidden text-[10px] text-gray-400 sm:block">{tab.description}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export function useSeoHubTab(): SeoHubTabId {
  const searchParams = useSearchParams();
  return parseTab(searchParams.get('tab'));
}
