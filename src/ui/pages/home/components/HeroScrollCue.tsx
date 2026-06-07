'use client';

import { ChevronDown } from 'lucide-react';

type HeroScrollCueProps = {
  href: string;
  label: string;
};

function prefetchBelowFold() {
  void import('./VendorsSection');
}

/** Prefetches vendors chunk on intent so the first scroll feels instant */
export function HeroScrollCue({ href, label }: HeroScrollCueProps) {
  return (
    <a
      href={href}
      className="landing-hero__scroll-cue landing-hero__scroll-cue--enter"
      onPointerEnter={prefetchBelowFold}
      onFocus={prefetchBelowFold}
    >
      <span className="landing-hero__scroll-cue-icon" aria-hidden>
        <span className="landing-hero__scroll-line" />
        <span className="landing-hero__scroll-chevron-wrap landing-hero__scroll-chevron-wrap--bob">
          <ChevronDown className="landing-hero__scroll-chevron" />
        </span>
      </span>
      <span>{label}</span>
    </a>
  );
}
