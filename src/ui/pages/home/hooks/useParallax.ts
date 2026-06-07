'use client';

import { useRef } from 'react';
import { useScroll, useTransform, useVelocity, type MotionValue } from 'framer-motion';

type ScrollOffset = NonNullable<Parameters<typeof useScroll>[0]>['offset'];

/** Passive scroll listeners — cheaper than layout-effect scroll tracking */
const SCROLL_OPTS = { layoutEffect: false } as const;

/** Tuned spring pairs for ambient chrome only (not scroll-scrubbed content) */
export const PARALLAX_SPRING = {
  hero: { stiffness: 118, damping: 28 },
  cinematic: { stiffness: 52, damping: 18 },
  ambient: { stiffness: 140, damping: 34 },
  crisp: { stiffness: 120, damping: 32 },
} as const;

/** Bind scroll progress to a section element */
export function useSectionParallax(offset: ScrollOffset = ['start end', 'end start']) {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset, ...SCROLL_OPTS });
  return { ref, scrollYProgress };
}

/** Hero-specific: progress while section exits viewport top */
export function useHeroParallax() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start start', 'end start'],
    ...SCROLL_OPTS,
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

/** Per-item Y drift scaled by grid column */
export function useStaggeredParallaxY(
  progress: MotionValue<number>,
  index: number,
  columns = 3,
  range: [number, number] = [4, -5],
  input: [number, number] = [0, 1],
) {
  const depth = 0.7 + (index % columns) * 0.38;
  return useTransform(progress, input, [
    `${range[0] * depth}%`,
    `${range[1] * depth}%`,
  ]);
}

/** Per-item X drift for alternating columns */
export function useStaggeredParallaxX(
  progress: MotionValue<number>,
  index: number,
  range: [number, number] = [-2, 2],
  input: [number, number] = [0, 1],
) {
  const sign = index % 2 === 0 ? 1 : -1;
  return useTransform(progress, input, [
    `${range[0] * sign}%`,
    `${range[1] * sign}%`,
  ]);
}

/** Scale pulse tied to scroll velocity — subtle zoom on fast scrub */
export function useScrollVelocityScale(
  progress: MotionValue<number>,
  range: [number, number] = [1, 1.04],
  velocityRange = 1800,
) {
  const velocity = useVelocity(progress);
  const absVel = useTransform(velocity, (v) => Math.min(Math.abs(v) / velocityRange, 1));
  return useTransform(absVel, [0, 1], range);
}

/** Brief opacity flash on fast scroll — cinematic velocity feedback */
export function useScrollVelocityFlash(
  progress: MotionValue<number>,
  maxOpacity = 0.14,
  velocityRange = 2400,
) {
  const velocity = useVelocity(progress);
  const absVel = useTransform(velocity, (v) => Math.min(Math.abs(v) / velocityRange, 1));
  return useTransform(absVel, [0, 1], [0, maxOpacity]);
}

/** Velocity-reactive blur — peaks during fast scroll, clears when idle */
export function useScrollVelocityBlur(
  progress: MotionValue<number>,
  maxBlur = 4,
  velocityRange = 2200,
) {
  const velocity = useVelocity(progress);
  return useTransform(
    velocity,
    [-velocityRange, 0, velocityRange],
    [`blur(${maxBlur}px)`, 'blur(0px)', `blur(${maxBlur}px)`],
  );
}

/** Per-item Y rotate for card grids */
export function useStaggeredParallaxRotateY(
  progress: MotionValue<number>,
  index: number,
  columns = 3,
  range: [number, number] = [-2.5, 2.5],
  input: [number, number] = [0, 1],
) {
  const sign = index % 2 === 0 ? 1 : -1;
  const depth = 0.6 + (index % columns) * 0.32;
  return useTransform(progress, input, [
    `${range[0] * sign * depth}deg`,
    `${range[1] * sign * depth}deg`,
  ]);
}

/** Scroll-scrubbed fill for progress rails */
export function useScrollScrubFill(
  progress: MotionValue<number>,
  start: number,
  end: number,
) {
  return useTransform(progress, [start, end], [0, 1]);
}

/** Rotate subtly on scroll */
export function useParallaxRotate(
  progress: MotionValue<number>,
  range: [number, number] = [-2, 2],
  input: [number, number] = [0, 1],
) {
  return useTransform(progress, input, [`${range[0]}deg`, `${range[1]}deg`]);
}

/** 3D tilt for perspective scenes */
export function useParallaxTilt(
  progress: MotionValue<number>,
  axis: 'x' | 'y',
  range: [number, number],
  input: [number, number] = [0, 1],
) {
  return useTransform(progress, input, [`${range[0]}deg`, `${range[1]}deg`]);
}

/** Multi-stop depth layer */
export function useDepthLayerY(
  progress: MotionValue<number>,
  speed: number,
  stops: [number, number][] = [
    [0, 6],
    [1, -8],
  ],
) {
  const input = stops.map(([p]) => p);
  const output = stops.map(([, v]) => `${v * speed}%`);
  return useTransform(progress, input, output);
}

export { SCROLL_OPTS };
