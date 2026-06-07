'use client';

import { useEffect, useState } from 'react';
import {
  motion,
  useMotionValueEvent,
  useTransform,
  type MotionValue,
} from 'framer-motion';
import { LANDING_SECTIONS } from '../copy';
import { scrollToLandingSection } from '../hooks/useLandingSectionNav';
import { Pressable, TickerFlip } from './MicroMotion';
import { ParallaxMotion } from './ParallaxMotion';

type LandingScrollChapterRailProps = {
  progress: MotionValue<number>;
};

/** Fixed chapter rail — scroll progress + active section for cinematic homepage */
export function LandingScrollChapterRail({ progress }: LandingScrollChapterRailProps) {
  const [activeId, setActiveId] = useState<string>(LANDING_SECTIONS[0].id);
  const [pct, setPct] = useState(0);
  const height = useTransform(progress, [0, 1], ['0%', '100%']);

  useMotionValueEvent(progress, 'change', (v) => setPct(Math.round(v * 100)));

  useEffect(() => {
    const observers: IntersectionObserver[] = [];

    LANDING_SECTIONS.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (!el) return;

      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) setActiveId(id);
        },
        { rootMargin: '-42% 0px -42% 0px', threshold: 0 },
      );

      observer.observe(el);
      observers.push(observer);
    });

    return () => observers.forEach((o) => o.disconnect());
  }, []);

  const activeIndex = LANDING_SECTIONS.findIndex((s) => s.id === activeId);
  const active = LANDING_SECTIONS[activeIndex] ?? LANDING_SECTIONS[0];
  const chapter = String(activeIndex + 1).padStart(2, '0');

  return (
    <nav className="landing-chapter-rail" aria-label="Page chapters">
      <TickerFlip value={String(pct).padStart(2, '0')} className="landing-chapter-rail__pct font-display" />

      <div className="landing-chapter-rail__track" aria-hidden>
        <ParallaxMotion className="landing-chapter-rail__fill" modes={['height']} height={height} />
      </div>

      <ol className="landing-chapter-rail__list">
        {LANDING_SECTIONS.map(({ id, shortLabel }, index) => {
          const isActive = activeId === id;
          const num = String(index + 1).padStart(2, '0');

          return (
            <li key={id}>
              <Pressable
                type="button"
                className={`landing-chapter-rail__dot${isActive ? ' landing-chapter-rail__dot--active' : ''}`}
                aria-current={isActive ? 'step' : undefined}
                aria-label={`${shortLabel}, section ${num}`}
                onClick={() => scrollToLandingSection(id)}
              >
                {isActive && (
                  <motion.span
                    layoutId="landing-chapter-indicator"
                    className="landing-chapter-rail__indicator"
                    transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                    aria-hidden
                  />
                )}
                <span className="landing-chapter-rail__index">{num}</span>
                <span className="landing-chapter-rail__label">{shortLabel}</span>
              </Pressable>
            </li>
          );
        })}
      </ol>

      <div className="landing-chapter-rail__active" aria-live="polite">
        <motion.span
          key={chapter}
          className="landing-chapter-rail__active-chapter"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 380, damping: 28 }}
        >
          {chapter}
        </motion.span>
        <motion.span
          key={active.label}
          className="landing-chapter-rail__active-label"
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 380, damping: 28, delay: 0.04 }}
        >
          {active.label}
        </motion.span>
      </div>
    </nav>
  );
}
