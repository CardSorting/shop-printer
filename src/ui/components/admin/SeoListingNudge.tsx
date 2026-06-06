'use client';

import { AlertCircle, ArrowDown } from 'lucide-react';
import { SEO_LISTING_PASS_SCORE } from '@domain/seo/helpers';
import { listingNudgeMessage } from '@domain/seo/merchant-ui';
import { SeoTrafficLight } from './SeoTrafficLight';
import type { SeoTrafficLightState } from '@domain/seo/traffic-light';

interface SeoListingNudgeProps {
  score: number;
  sectionId?: string;
  trafficLight?: SeoTrafficLightState;
  topFix?: string;
  onOpen?: () => void;
}

/** Sticky bottom bar when a listing score is below pass threshold — Yoast-style nudge */
export function SeoListingNudge({
  score,
  sectionId = 'section-search-listing',
  trafficLight,
  topFix,
  onOpen,
}: SeoListingNudgeProps) {
  if (score >= SEO_LISTING_PASS_SCORE) return null;

  const message = listingNudgeMessage(score, topFix);

  const scrollToSection = () => {
    if (onOpen) {
      onOpen();
      return;
    }
    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-amber-200 bg-amber-50/95 px-4 py-3 shadow-lg backdrop-blur-md animate-in slide-in-from-bottom-2 duration-300">
      <div className="mx-auto flex max-w-5xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <div className="min-w-0">
            {trafficLight ? (
              <SeoTrafficLight state={trafficLight} compact />
            ) : (
              <p className="text-[10px] font-black uppercase tracking-widest text-amber-800">
                Search listing needs work ({score}/100)
              </p>
            )}
            <p className="mt-0.5 text-xs text-gray-700">{message}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={scrollToSection}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-white hover:bg-black"
        >
          Open search listing
          <ArrowDown className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}
