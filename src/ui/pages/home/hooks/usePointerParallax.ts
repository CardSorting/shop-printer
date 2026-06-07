'use client';

import { useCallback, useEffect, useRef, type PointerEvent as ReactPointerEvent, type RefObject } from 'react';
import { useMotionValue, useSpring, useTransform, type MotionValue } from 'framer-motion';
import { usePrefersReducedMotion } from './usePrefersReducedMotion';

type PointerParallaxOptions = {
  strength?: number;
  stiffness?: number;
  damping?: number;
  /** Defer listener attachment until hero/content has painted */
  enabled?: boolean;
};

/** Viewport-center pointer drift — one listener with fore/back depth layers */
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
    const finePointer = window.matchMedia('(pointer: fine)').matches;
    if (!finePointer) return;

    let frame = 0;
    let lastEvent: PointerEvent | null = null;

    const flush = () => {
      frame = 0;
      if (lastEvent) resolveOffset(lastEvent);
    };

    const onMove = (event: PointerEvent) => {
      lastEvent = event;
      if (!frame) frame = requestAnimationFrame(flush);
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    return () => {
      window.removeEventListener('pointermove', onMove);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [reduced, resolveOffset]);

  const spring = reduced
    ? { stiffness: 10000, damping: 500, restDelta: 0.01 }
    : { stiffness, damping, restDelta: 0.012 };

  const smoothX = useSpring(rawX, spring);
  const smoothY = useSpring(rawY, spring);

  const x = useTransform(smoothX, (v) => `${v}%`);
  const y = useTransform(smoothY, (v) => `${v}%`);
  const backX = useTransform(smoothX, (v) => `${v * 0.5}%`);
  const backY = useTransform(smoothY, (v) => `${v * 0.5}%`);

  return {
    x,
    y,
    back: { x: backX, y: backY },
    fore: { x, y },
  };
}

/** Element-relative pointer drift — tighter hero / card focus */
export function useElementPointerParallax(
  ref: RefObject<HTMLElement | null>,
  { strength = 5, stiffness = 42, damping = 24, enabled = true }: PointerParallaxOptions = {},
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
    if (reduced || !enabled) return;
    const finePointer = window.matchMedia('(pointer: fine)').matches;
    if (!finePointer) return;

    let frame = 0;
    let lastEvent: PointerEvent | null = null;
    const flush = () => {
      frame = 0;
      if (lastEvent) resolveOffset(lastEvent);
    };
    const onMove = (event: PointerEvent) => {
      lastEvent = event;
      if (!frame) frame = requestAnimationFrame(flush);
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    return () => {
      window.removeEventListener('pointermove', onMove);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [reduced, resolveOffset, enabled]);

  return {
    x: useTransform(rawX, (v) => `${v}%`),
    y: useTransform(rawY, (v) => `${v}%`),
  };
}

const INSTANT_SPRING = { stiffness: 10000, damping: 500, restDelta: 0.001 };

/** Scoped 3D tilt on pointer move — for cards and counter tiles */
export function useTilePointerTilt(maxRotate = 5.5) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = usePrefersReducedMotion();
  const rawRotateX = useMotionValue(0);
  const rawRotateY = useMotionValue(0);

  const spring = reduced ? INSTANT_SPRING : { stiffness: 300, damping: 24, restDelta: 0.0008 };
  const rotateX = useSpring(rawRotateX, spring);
  const rotateY = useSpring(rawRotateY, spring);

  const onPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (reduced) return;
      const rect = ref.current?.getBoundingClientRect();
      if (!rect) return;
      const px = (event.clientX - rect.left) / rect.width - 0.5;
      const py = (event.clientY - rect.top) / rect.height - 0.5;
      rawRotateY.set(px * maxRotate * 2);
      rawRotateX.set(-py * maxRotate * 2);
    },
    [reduced, rawRotateX, rawRotateY, maxRotate],
  );

  const onPointerLeave = useCallback(() => {
    rawRotateX.set(0);
    rawRotateY.set(0);
  }, [rawRotateX, rawRotateY]);

  const rotateXDeg = useTransform(rotateX, (v) => `${v}deg`);
  const rotateYDeg = useTransform(rotateY, (v) => `${v}deg`);

  return {
    ref,
    rotateX: rotateXDeg,
    rotateY: rotateYDeg,
    onPointerMove,
    onPointerLeave,
  };
}

/** Subtle magnetic pull toward cursor — for CTAs and links */
export function useMagneticHover(strength = 10) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = usePrefersReducedMotion();
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const spring = reduced ? INSTANT_SPRING : { stiffness: 360, damping: 20, restDelta: 0.0008 };
  const x = useSpring(rawX, spring);
  const y = useSpring(rawY, spring);

  const onPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (reduced) return;
      const rect = ref.current?.getBoundingClientRect();
      if (!rect) return;
      const px = (event.clientX - rect.left) / rect.width - 0.5;
      const py = (event.clientY - rect.top) / rect.height - 0.5;
      rawX.set(px * strength);
      rawY.set(py * strength);
    },
    [reduced, rawX, rawY, strength],
  );

  const onPointerLeave = useCallback(() => {
    rawX.set(0);
    rawY.set(0);
  }, [rawX, rawY]);

  return { ref, x, y, onPointerMove, onPointerLeave };
}
