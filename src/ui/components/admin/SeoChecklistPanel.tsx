'use client';

import { Check } from 'lucide-react';
import type { SeoChecklistItem } from '@domain/seo/health';
import type { SeoRecommendation } from '@domain/seo/recommendations';

interface SeoChecklistPanelProps {
  checklist: SeoChecklistItem[];
  recommendations?: SeoRecommendation[];
  title?: string;
}

/** Reusable Yoast-style checklist — products, blog, and hub */
export function SeoChecklistPanel({
  checklist,
  recommendations = [],
  title = 'Search checklist',
}: SeoChecklistPanelProps) {
  const topRecs = recommendations.filter((r) => r.priority === 'high').slice(0, 3);

  return (
    <div className="space-y-4">
      <h4 className="text-[10px] font-bold uppercase tracking-widest text-gray-500">{title}</h4>
      <ul className="space-y-2.5">
        {checklist.map((item) => (
          <li key={item.id} className="flex items-start gap-2">
            <span
              className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                item.done ? 'border-green-200 bg-green-100 text-green-600' : 'border-gray-200 bg-white text-gray-300'
              }`}
            >
              {item.done && <Check className="h-2.5 w-2.5" />}
            </span>
            <div>
              <span className={`text-[11px] font-medium ${item.done ? 'text-gray-900' : 'text-gray-500'}`}>
                {item.label}
              </span>
              {!item.done && item.hint && (
                <p className="mt-0.5 text-[10px] leading-relaxed text-gray-500">{item.hint}</p>
              )}
            </div>
          </li>
        ))}
      </ul>
      {topRecs.length > 0 && (
        <div className="rounded-lg border border-amber-100 bg-amber-50/50 p-3">
          <p className="text-[10px] font-black uppercase tracking-widest text-amber-800">Do this next</p>
          <ul className="mt-2 space-y-1">
            {topRecs.map((rec) => (
              <li key={rec.id} className="text-[11px] text-amber-900">
                · {rec.detail}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
