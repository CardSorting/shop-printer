'use client';

import { useRef } from 'react';
import { useScroll, useTransform, type MotionValue } from 'framer-motion';

type ScrollOffset = NonNullable<Parameters<typeof useScroll>[0]>['offset'];

/** Bind scroll progress to a section element */
export function useSectionParallax(offset: ScrollOffset = ['start end', 'end start']) {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset });
  return { ref, scrollYProgress };
}

/** Hero-specific: progress while section exits viewport top */
export function useHeroParallax() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start start', 'end start'],
  });
  return { ref, scrollYProgress };
}

/** Map scroll progress to vertical shift */
export function useParallaxY(
  progress: MotionValue<number>,
  range: [number, number] = [-12, 12],
  input: [number, number] = [0, 1],
) {
  return useTransform(progress, input, [`${range[0]}%`, `${range[1]}%`]);
}

/** Map scroll progress to scale */
export function useParallaxScale(
  progress: MotionValue<number>,
  range: [number, number] = [1, 1.12],
  input: [number, number] = [0, 1],
) {
  return useTransform(progress, input, range);
}

/** Map scroll progress to horizontal shift */
export function useParallaxX(
  progress: MotionValue<number>,
  range: [number, number] = [-6, 6],
  input: [number, number] = [0, 1],
) {
  return useTransform(progress, input, [`${range[0]}%`, `${range[1]}%`]);
}

/** Fade based on scroll */
export function useParallaxOpacity(
  progress: MotionValue<number>,
  range: [number, number] = [1, 0],
  input: [number, number] = [0, 0.85],
) {
  return useTransform(progress, input, range);
}

/** Rotate subtly on scroll */
export function useParallaxRotate(
  progress: MotionValue<number>,
  range: [number, number] = [-2, 2],
) {
  return useTransform(progress, [0, 1], range);
}
