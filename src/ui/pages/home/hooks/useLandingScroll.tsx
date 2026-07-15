'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useScroll, type MotionValue } from 'framer-motion';
import { usePrefersReducedMotion } from './usePrefersReducedMotion';

type LandingScrollContextValue = {
  /** Direct scroll progress — no spring (1:1 scrub) */
  progress: MotionValue<number>;
};

const LandingScrollContext = createContext<LandingScrollContextValue | null>(null);

/** Single passive document scroll listener for the homepage. */
export function LandingScrollProvider({ children }: { children: ReactNode }) {
  const { scrollYProgress } = useScroll();

  return (
    <LandingScrollContext.Provider value={{ progress: scrollYProgress }}>
      {children}
    </LandingScrollContext.Provider>
  );
}

function useLandingScrollContext(): LandingScrollContextValue {
  const ctx = useContext(LandingScrollContext);
  if (!ctx) {
    throw new Error('Landing scroll hooks must be used within LandingScrollProvider');
  }
  return ctx;
}

export function useLandingScroll(): MotionValue<number> {
  return useLandingScrollContext().progress;
}

export function useLandingScrollRaw(): MotionValue<number> {
  return useLandingScrollContext().progress;
}

/** Skip per-tile scroll parallax on touch/narrow viewports */
export function useLiteGridParallax(): boolean {
  const reduced = usePrefersReducedMotion();
  const [lite, setLite] = useState(false);

  useEffect(() => {
    const coarse = window.matchMedia('(pointer: coarse)').matches;
    const narrow = window.matchMedia('(max-width: 768px)').matches;
    setLite(Boolean(reduced) || coarse || narrow);
  }, [reduced]);

  return lite;
}

export function useLiteLandingMotion(): boolean {
  return useLiteGridParallax();
}
