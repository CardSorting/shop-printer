'use client';

import { useEffect, useRef } from 'react';
import { useScroll, useTransform, type MotionValue } from 'framer-motion';
import { HALL_FOOD_PARALLAX_FRAMES } from '../constants';
import { PARALLAX_SPRING } from './useParallax';
import { useSmoothProgress } from './useSmoothProgress';

/** Scroll progress within the currently pinned food parallax band */
export function useActiveFoodPassScroll(activePassId: string | null) {
  const targetRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    targetRef.current = activePassId
      ? document.querySelector<HTMLElement>(`[data-food-pass="${activePassId}"]`)
      : null;
  }, [activePassId]);

  const { scrollYProgress } = useScroll({
    target: targetRef,
    offset: ['start start', 'end end'],
  });

  return useSmoothProgress(scrollYProgress, PARALLAX_SPRING.cinematic);
}

/** Maps active pass + in-band progress to 0–1 tour progress across all frames */
export function useFoodTourProgress(
  activePassId: string | null,
  passProgress: MotionValue<number>,
) {
  const activeIndex = Math.max(
    0,
    HALL_FOOD_PARALLAX_FRAMES.findIndex((frame) => frame.id === activePassId),
  );
  const span = 1 / HALL_FOOD_PARALLAX_FRAMES.length;
  const start = activeIndex * span;

  return useTransform(passProgress, [0, 1], [start, start + span]);
}
