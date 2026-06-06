'use client';

import { SeoScoreRingPair } from './SeoScoreRing';
import { SeoTrafficLight } from './SeoTrafficLight';
import type { SeoScoreBreakdown } from '@domain/seo/score-breakdown';
import { SEO_MERCHANT_TERMS } from '@domain/seo/merchant-ui';

interface SeoScoreBreakdownPanelProps {
  breakdown: SeoScoreBreakdown;
}

/** Explains site vs. listing scores — familiar dual-metric pattern for non-technical merchants */
export function SeoScoreBreakdownPanel({ breakdown }: SeoScoreBreakdownPanelProps) {
  return (
    <section className="rounded-2xl border bg-white p-6 shadow-sm">
      <div className="mb-5">
        <h2 className="text-sm font-black text-gray-900">Two scores, two jobs</h2>
        <p className="mt-1 text-xs text-gray-500">
          Like Google Search Console: <strong className="font-bold text-gray-700">site health</strong> is your business
          basics; <strong className="font-bold text-gray-700">listing health</strong> is how each menu item, story,
          collection, or help article appears in search results.
        </p>
      </div>

      <SeoScoreRingPair
        siteScore={breakdown.siteScore}
        listingScore={breakdown.listingAverage}
        siteHint={breakdown.siteHint}
        listingHint={breakdown.listingHint}
      />

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border p-4">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
            {SEO_MERCHANT_TERMS.siteHealth}
          </p>
          <div className="mt-2">
            <SeoTrafficLight state={breakdown.siteTrafficLight} showMessage compact />
          </div>
        </div>
        <div className="rounded-xl border p-4">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
            {SEO_MERCHANT_TERMS.listingHealth}
          </p>
          <div className="mt-2">
            <SeoTrafficLight state={breakdown.listingTrafficLight} showMessage compact />
          </div>
          {breakdown.listingsTotal > 0 && (
            <p className="mt-2 text-[11px] text-gray-500">
              {breakdown.listingsOptimized}/{breakdown.listingsTotal} listings optimized
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
