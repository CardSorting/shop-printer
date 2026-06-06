'use client';

import { Check } from 'lucide-react';
import { auditLocalListingSignals } from '@domain/seo/local-listing-hints';
import type { ListingSeoInput } from '@domain/seo/health';

interface SeoLocalSignalsPanelProps {
  input: ListingSeoInput;
  compact?: boolean;
}

/** WoodBine local search signals — Yoast focus-keyphrase style, plain language */
export function SeoLocalSignalsPanel({ input, compact = false }: SeoLocalSignalsPanelProps) {
  const signals = auditLocalListingSignals(input);
  const allMet = signals.every((s) => s.met);

  if (allMet && compact) return null;

  return (
    <div className={`rounded-xl border ${allMet ? 'border-green-100 bg-green-50/40' : 'border-gray-100 bg-gray-50/50'} p-3`}>
      <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Local search signals</p>
      <ul className="mt-2 space-y-2">
        {signals.map((signal) => (
          <li key={signal.id} className="flex items-start gap-2">
            <span
              className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                signal.met ? 'border-green-200 bg-green-100 text-green-600' : 'border-gray-200 bg-white text-gray-300'
              }`}
            >
              {signal.met && <Check className="h-2.5 w-2.5" />}
            </span>
            <div>
              <span className={`text-[11px] font-medium ${signal.met ? 'text-gray-700' : 'text-gray-500'}`}>
                {signal.label}
              </span>
              {!signal.met && !compact && (
                <p className="mt-0.5 text-[10px] leading-snug text-gray-500">{signal.hint}</p>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
