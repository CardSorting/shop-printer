'use client';

import { useCallback, useEffect, type RefObject } from 'react';
import { useMotionValue, useSpring, useTransform } from 'framer-motion';
import { usePrefersReducedMotion } from './usePrefersReducedMotion';

type PointerParallaxOptions = {
  strength?: number;
  stiffness?: number;
  damping?: number;
};

/** Viewport-center pointer drift — global ambient layer */
export function usePointerParallax({
  strength = 3.5,
  stiffness = 38,
  damping = 22,
}: PointerParallaxOptions = {}) {
  const reduced = usePrefersReducedMotion();
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);

  const resolveOffset = useCallback(
    (event: PointerEvent) => {
      const cx = window.innerWidth * 0.5;
      const cy = window.innerHeight * 0.5;
      rawX.set(((event.clientX - cx) / cx) * strength);
      rawY.set(((event.clientY - cy) / cy) * strength);
    },
    [rawX, rawY, strength],
  );

  useEffect(() => {
    if (reduced) return;
    const onMove = (event: PointerEvent) => resolveOffset(event);
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
  }, [reduced, resolveOffset]);

  const spring = reduced
    ? { stiffness: 10000, damping: 500, restDelta: 0.001 }
    : { stiffness, damping, restDelta: 0.0008 };

  const smoothX = useSpring(rawX, spring);
  const smoothY = useSpring(rawY, spring);

  return {
    x: useTransform(smoothX, (v) => `${v}%`),
    y: useTransform(smoothY, (v) => `${v}%`),
  };
}

/** Element-relative pointer drift — tighter hero / card focus */
export function useElementPointerParallax(
  ref: RefObject<HTMLElement | null>,
  { strength = 5, stiffness = 42, damping = 24 }: PointerParallaxOptions = {},
) {
  const reduced = usePrefersReducedMotion();
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);

  const resolveOffset = useCallback(
    (event: PointerEvent) => {
      const rect = ref.current?.getBoundingClientRect();
      if (!rect) {
        const cx = window.innerWidth * 0.5;
        const cy = window.innerHeight * 0.5;
        rawX.set(((event.clientX - cx) / cx) * strength);
        rawY.set(((event.clientY - cy) / cy) * strength);
        return;
      }
      const cx = rect.left + rect.width * 0.5;
      const cy = rect.top + rect.height * 0.5;
      const rx = Math.max(rect.width * 0.5, 1);
      const ry = Math.max(rect.height * 0.5, 1);
      rawX.set(((event.clientX - cx) / rx) * strength);
      rawY.set(((event.clientY - cy) / ry) * strength);
    },
    [ref, rawX, rawY, strength],
  );

  useEffect(() => {
    if (reduced) return;
    const onMove = (event: PointerEvent) => resolveOffset(event);
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
  }, [reduced, resolveOffset]);

  const spring = reduced
    ? { stiffness: 10000, damping: 500, restDelta: 0.001 }
    : { stiffness, damping, restDelta: 0.0008 };

  const smoothX = useSpring(rawX, spring);
  const smoothY = useSpring(rawY, spring);

  return {
    x: useTransform(smoothX, (v) => `${v}%`),
    y: useTransform(smoothY, (v) => `${v}%`),
  };
}
