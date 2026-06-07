'use client';

import { useEffect, useState } from 'react';
import { motion, useMotionValueEvent, type MotionValue } from 'framer-motion';
import { LANDING_COPY, LANDING_SECTIONS } from '../copy';
import { TickerFlip } from './MicroMotion';

type LandingScrollTickerProps = {
  progress: MotionValue<number>;
};

/** Fixed bottom ticker — active section + scroll depth (cinematic homepage) */
export function LandingScrollTicker({ progress }: LandingScrollTickerProps) {
  const [pct, setPct] = useState(0);
  const [activeLabel, setActiveLabel] = useState<string>(LANDING_SECTIONS[0].label);

  useMotionValueEvent(progress, 'change', (v) => setPct(Math.round(v * 100)));

  useEffect(() => {
    const observers: IntersectionObserver[] = [];

    LANDING_SECTIONS.forEach(({ id, label }) => {
      const el = document.getElementById(id);
      if (!el) return;

      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) setActiveLabel(label);
        },
        { rootMargin: '-44% 0px -44% 0px', threshold: 0 },
      );

      observer.observe(el);
      observers.push(observer);
    });

    return () => observers.forEach((o) => o.disconnect());
  }, []);

  return (
    <motion.div
      className="landing-cinema-ticker"
      aria-hidden
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 380, damping: 32, delay: 0.4 }}
    >
      <TickerFlip value={activeLabel} className="landing-cinema-ticker__section" />
      <span className="landing-cinema-ticker__sep" aria-hidden />
      <TickerFlip value={String(pct).padStart(3, '0')} className="landing-cinema-ticker__pct font-display" />
      <span className="landing-cinema-ticker__unit">{LANDING_COPY.tickerUnit}</span>
    </motion.div>
  );
}
