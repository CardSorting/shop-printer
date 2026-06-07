'use client';

import { useEffect } from 'react';
import { useMotionValue, useTransform, type MotionValue } from 'framer-motion';
import { HALL_FOOD_PARALLAX_FRAMES } from '../constants';
import { usePrefersReducedMotion } from './usePrefersReducedMotion';

/** Mirrors useScroll offset ['start start', 'end end'] for a pinned section */
function measurePinnedScrollProgress(el: HTMLElement): number {
  const rect = el.getBoundingClientRect();
  const scrollY = window.scrollY;
  const viewportHeight = window.innerHeight;
  const targetTop = scrollY + rect.top;
  const targetBottom = targetTop + el.offsetHeight;
  const start = targetTop;
  const end = targetBottom - viewportHeight;
  const range = end - start;

  if (range <= 0) {
    return rect.top <= 0 ? 1 : 0;
  }

  return Math.min(Math.max((scrollY - start) / range, 0), 1);
}

/**
 * Scroll progress within the active food parallax band — direct scrub, rAF-batched.
 */
export function useActiveFoodPassScroll(activePassId: string): MotionValue<number> {
  const raw = useMotionValue(0);
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    if (reduced) {
      raw.set(0);
      return;
    }

    const el = document.querySelector<HTMLElement>(`[data-food-pass="${activePassId}"]`);
    if (!el) {
      raw.set(0);
      return;
    }

    let raf = 0;
    const update = () => {
      raf = 0;
      raw.set(measurePinnedScrollProgress(el));
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };

    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [activePassId, raw, reduced]);

  return raw;
}

/** Maps active pass + in-band progress to 0–1 tour progress across all frames */
export function useFoodTourProgress(activePassId: string, passProgress: MotionValue<number>) {
  const activeIndex = Math.max(
    0,
    HALL_FOOD_PARALLAX_FRAMES.findIndex((frame) => frame.id === activePassId),
  );
  const span = 1 / HALL_FOOD_PARALLAX_FRAMES.length;
  const start = activeIndex * span;

  return useTransform(passProgress, [0, 1], [start, start + span]);
}
