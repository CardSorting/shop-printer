'use client';

import Link from 'next/link';
import { Search, ArrowRight, CheckCircle2 } from 'lucide-react';
import { gradeLabel } from '@domain/seo/health';
import { widgetInsight, SEO_MERCHANT_TERMS } from '@domain/seo/merchant-ui';
import { useSeoSnapshot } from '@ui/hooks/useSeoSnapshot';
import { SeoTrafficLight } from './SeoTrafficLight';
import { SeoScoreRing } from './SeoScoreRing';

/** Compact SEO health card for admin Home — links to Search & Visibility hub */
export function SeoHealthWidget() {
  const { data, loading } = useSeoSnapshot();

  const score = data?.site.score ?? null;
  const needsWork = data?.snapshot.combinedNeedsWork ?? 0;
  const trafficLight = data?.report.siteTrafficLight;
  const setupProgress = data?.report.setupProgress;
  const topQuickWin = data?.report.quickWins[0];
  const ctaHref = needsWork > 0 ? '/admin/seo?tab=listings' : '/admin/seo';

  return (
    <section className="overflow-hidden rounded-xl border bg-white shadow-sm">
      <div className="flex items-center justify-between border-b bg-gray-50/50 px-5 py-4">
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-primary-500" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-gray-900">{SEO_MERCHANT_TERMS.hubTitle}</h2>
        </div>
        <Link href={ctaHref} className="text-[10px] font-bold uppercase tracking-wider text-primary-600 hover:text-primary-700">
          Open →
        </Link>
      </div>
      <div className="p-5">
        {loading || score === null ? (
          <p className="text-xs text-gray-500">Loading visibility score…</p>
        ) : (
          <div className="space-y-4">
            {setupProgress && setupProgress.percent < 100 && (
              <div>
                <div className="mb-1 flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-gray-500">
                  <span>Setup progress</span>
                  <span className="text-primary-600">{setupProgress.percent}%</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
                  <div
                    className="h-full bg-primary-600 transition-all duration-700"
                    style={{ width: `${setupProgress.percent}%` }}
                  />
                </div>
              </div>
            )}
            <div className="flex items-center justify-between gap-4">
              <SeoScoreRing score={score} size={72} strokeWidth={6} />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-gray-500">{gradeLabel(data!.site.grade)}</p>
                {trafficLight && (
                  <div className="mt-2">
                    <SeoTrafficLight state={trafficLight} compact />
                  </div>
                )}
                {needsWork === 0 ? (
                  <CheckCircle2 className="mt-2 h-6 w-6 text-green-500" />
                ) : (
                  <span className="mt-2 inline-flex rounded-full bg-amber-100 px-2 py-1 text-[10px] font-black uppercase text-amber-800">
                    {needsWork} to fix
                  </span>
                )}
              </div>
            </div>
            <p className="text-[11px] leading-relaxed text-gray-500">
              {widgetInsight(needsWork, topQuickWin?.title)}
            </p>
            {setupProgress?.nextTask && (
              <Link
                href={setupProgress.nextTask.href}
                className="block rounded-lg border border-primary-100 bg-primary-50/50 px-3 py-2 text-[10px] font-bold text-primary-800 hover:bg-primary-50"
              >
                Next: {setupProgress.nextTask.label} →
              </Link>
            )}
            {topQuickWin && needsWork > 0 && (
              <Link
                href={topQuickWin.href}
                className="block rounded-lg border border-amber-100 bg-amber-50/50 px-3 py-2 text-[10px] font-bold text-amber-900 hover:bg-amber-50"
              >
                Quick win: {topQuickWin.title} →
              </Link>
            )}
            <Link
              href={ctaHref}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-primary-100 py-2 text-[10px] font-black uppercase tracking-widest text-primary-600 transition hover:bg-primary-50"
            >
              {needsWork > 0 ? 'Fix listings' : 'Manage visibility'} <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
