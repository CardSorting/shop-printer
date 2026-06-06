'use client';

import Link from 'next/link';
import { AlertTriangle, ArrowRight } from 'lucide-react';
import { listingAlertBody, listingAlertTitle } from '@domain/seo/merchant-ui';
import { useSeoSnapshot } from '@ui/hooks/useSeoSnapshot';

interface SeoListingsAlertProps {
  /** When set, used instead of fetching */
  needsWork?: number;
  compact?: boolean;
}

/** Shopify-style alert banner linking to Search & Visibility hub */
export function SeoListingsAlert({ needsWork: needsWorkProp, compact = false }: SeoListingsAlertProps) {
  const { data } = useSeoSnapshot();
  const needsWork = needsWorkProp ?? data?.snapshot.combinedNeedsWork ?? 0;
  const topQuickWin = data?.report.quickWins[0];

  if (needsWork <= 0) return null;

  if (compact) {
    return (
      <Link
        href="/admin/seo?tab=listings"
        className="inline-flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-amber-800 hover:bg-amber-100"
      >
        <AlertTriangle className="h-3 w-3" />
        {needsWork} listing{needsWork === 1 ? '' : 's'} need SEO
      </Link>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50/80 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
        <div>
          <p className="text-sm font-bold text-gray-900">{listingAlertTitle(needsWork)}</p>
          <p className="mt-0.5 text-xs text-gray-600">{listingAlertBody(needsWork)}</p>
          {topQuickWin && (
            <Link href={topQuickWin.href} className="mt-2 inline-block text-xs font-bold text-primary-600 hover:text-primary-700">
              Start with {topQuickWin.title} →
            </Link>
          )}
        </div>
      </div>
      <Link
        href="/admin/seo?tab=listings"
        className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-white hover:bg-black"
      >
        Review in Search & Visibility
        <ArrowRight className="h-3 w-3" />
      </Link>
    </div>
  );
}
