'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { SeoGlossaryEntry } from '@domain/seo/glossary';

interface SeoFaqAccordionProps {
  entries: readonly SeoGlossaryEntry[];
  title?: string;
}

/** Expandable FAQ — familiar pattern from Shopify Help and Yoast docs */
export function SeoFaqAccordion({ entries, title = 'Common terms' }: SeoFaqAccordionProps) {
  const [openId, setOpenId] = useState<string | null>(entries[0]?.id ?? null);

  return (
    <section className="rounded-2xl border bg-white p-6 shadow-sm">
      <h2 className="text-sm font-black text-gray-900">{title}</h2>
      <p className="mt-1 text-xs text-gray-500">Tap a term — no jargon, just plain answers.</p>
      <div className="mt-4 divide-y rounded-xl border">
        {entries.map((entry) => {
          const open = openId === entry.id;
          return (
            <div key={entry.id}>
              <button
                type="button"
                onClick={() => setOpenId(open ? null : entry.id)}
                className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left transition hover:bg-gray-50"
                aria-expanded={open}
              >
                <span className="text-sm font-bold text-gray-900">{entry.term}</span>
                <ChevronDown className={`h-4 w-4 shrink-0 text-gray-400 transition ${open ? 'rotate-180' : ''}`} />
              </button>
              {open && (
                <p className="border-t bg-gray-50/50 px-4 py-3 text-xs leading-relaxed text-gray-600">{entry.definition}</p>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
