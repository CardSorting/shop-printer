'use client';

import { useSeoSnapshot } from '@ui/hooks/useSeoSnapshot';

/** Sidebar badge for Search & Visibility — mirrors OrderBadge pattern */
export function SeoNavBadge() {
  const { data } = useSeoSnapshot();
  const count = data?.snapshot.combinedNeedsWork ?? 0;

  if (count <= 0) return null;

  return (
    <span className="flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-amber-100 px-1.5 text-[10px] font-bold text-amber-800 ring-1 ring-inset ring-amber-600/20 animate-in zoom-in duration-300">
      {count}
    </span>
  );
}
