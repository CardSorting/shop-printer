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

/** URL-driven tabs — shareable links like `/admin/seo?tab=listings` */
export function SeoHubTabs() {
  const searchParams = useSearchParams();
  const active = parseTab(searchParams.get('tab'));

  return (
    <nav className="flex flex-wrap gap-1 rounded-xl border bg-gray-50/80 p-1" aria-label="Search and visibility sections">
      {SEO_HUB_TABS.map((tab) => (
        <Link
          key={tab.id}
          href={seoHubTabHref(tab.id)}
          className={`rounded-lg px-4 py-2.5 text-left transition ${
            active === tab.id
              ? 'bg-white text-gray-900 shadow-sm ring-1 ring-black/5'
              : 'text-gray-500 hover:text-gray-800'
          }`}
        >
          <span className="block text-xs font-bold">{tab.label}</span>
          <span className="hidden text-[10px] text-gray-400 sm:block">{tab.description}</span>
        </Link>
      ))}
    </nav>
  );
}

export function useSeoHubTab(): SeoHubTabId {
  const searchParams = useSearchParams();
  return parseTab(searchParams.get('tab'));
}
