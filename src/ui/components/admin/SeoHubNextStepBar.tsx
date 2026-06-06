'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { SeoSetupProgress } from '@domain/seo/setup-progress';

interface SeoHubNextStepBarProps {
  progress: SeoSetupProgress;
}

/** Compact next-step strip — Shopify “continue setup” pattern */
export function SeoHubNextStepBar({ progress }: SeoHubNextStepBarProps) {
  if (!progress.nextTask || progress.percent >= 100) return null;

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-primary-100 bg-primary-50/50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest text-primary-700">
          {progress.percent}% complete · Next step
        </p>
        <p className="mt-0.5 text-sm font-bold text-gray-900">{progress.nextTask.label}</p>
        <p className="text-xs text-gray-600">{progress.nextTask.description}</p>
      </div>
      <Link
        href={progress.nextTask.href}
        className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-white hover:bg-black"
      >
        Continue
        <ArrowRight className="h-3 w-3" />
      </Link>
    </div>
  );
}
