'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Search, ArrowRight, CheckCircle2 } from 'lucide-react';
import { gradeLabel } from '@domain/seo/health';

interface SeoSnapshotResponse {
  site: { score: number; grade: string };
  snapshot: { combinedNeedsWork: number; products: { total: number }; blogPosts: { total: number } };
}

/** Compact SEO health card for admin Home — links to Search & Visibility hub */
export function SeoHealthWidget() {
  const [data, setData] = useState<SeoSnapshotResponse | null>(null);

  useEffect(() => {
    fetch('/api/admin/seo/snapshot')
      .then((r) => (r.ok ? r.json() : null))
      .then(setData)
      .catch(() => setData(null));
  }, []);

  const score = data?.site.score ?? null;
  const needsWork = data?.snapshot.combinedNeedsWork ?? 0;

  return (
    <section className="overflow-hidden rounded-xl border bg-white shadow-sm">
      <div className="flex items-center justify-between border-b bg-gray-50/50 px-5 py-4">
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-primary-500" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-gray-900">Search & Visibility</h2>
        </div>
        <Link href="/admin/seo" className="text-[10px] font-bold uppercase tracking-wider text-primary-600 hover:text-primary-700">
          Open →
        </Link>
      </div>
      <div className="p-5">
        {score === null ? (
          <p className="text-xs text-gray-500">Loading visibility score…</p>
        ) : (
          <div className="space-y-4">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-3xl font-black text-gray-900">{score}</p>
                <p className="text-xs font-bold text-gray-500">{gradeLabel(data!.site.grade as any)}</p>
              </div>
              {needsWork === 0 ? (
                <CheckCircle2 className="h-8 w-8 text-green-500" />
              ) : (
                <span className="rounded-full bg-amber-100 px-2 py-1 text-[10px] font-black uppercase text-amber-800">
                  {needsWork} to fix
                </span>
              )}
            </div>
            <p className="text-[11px] leading-relaxed text-gray-500">
              {needsWork > 0
                ? 'Some menu items or stories could use a stronger search listing.'
                : 'Site basics and listings look healthy.'}
            </p>
            <Link
              href="/admin/seo"
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-primary-100 py-2 text-[10px] font-black uppercase tracking-widest text-primary-600 transition hover:bg-primary-50"
            >
              Manage visibility <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
