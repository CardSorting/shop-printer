'use client';

import { useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import type { SeoGuideEntry } from '@domain/seo/guides';

interface SeoGuideGridProps {
  guides: readonly SeoGuideEntry[];
  icons: Record<SeoGuideEntry['icon'], React.ComponentType<{ className?: string }>>;
}

/** Learn tab guides with deep-link highlight — ?tab=learn&guide=search-listing */
export function SeoGuideGrid({
  guides,
  icons: IconMap,
}: SeoGuideGridProps) {
  const searchParams = useSearchParams();
  const activeGuide = searchParams.get('guide');
  const highlightRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!activeGuide || !highlightRef.current) return;
    highlightRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [activeGuide]);

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {guides.map((guide) => {
        const Icon = IconMap[guide.icon];
        const highlighted = activeGuide === guide.id;
        return (
          <article
            key={guide.id}
            id={`guide-${guide.id}`}
            ref={highlighted ? highlightRef : undefined}
            className={`rounded-2xl border bg-white p-6 shadow-sm transition ${
              highlighted ? 'ring-2 ring-primary-400 border-primary-200' : ''
            }`}
          >
            <div className="mb-3 flex items-center gap-2">
              <div className="rounded-lg bg-primary-50 p-2 text-primary-600">
                <Icon className="h-4 w-4" />
              </div>
              <h2 className="text-sm font-black text-gray-900">{guide.title}</h2>
            </div>
            <p className="text-xs leading-relaxed text-gray-600">{guide.summary}</p>
            <ol className="mt-4 space-y-2">
              {guide.steps.map((step, i) => (
                <li key={step} className="flex gap-2 text-xs text-gray-700">
                  <span className="font-black text-primary-600">{i + 1}.</span>
                  {step}
                </li>
              ))}
            </ol>
          </article>
        );
      })}
    </div>
  );
}
