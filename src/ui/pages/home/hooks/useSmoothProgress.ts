import { useSpring, type MotionValue } from 'framer-motion';
import { usePrefersReducedMotion } from './usePrefersReducedMotion';

type SpringPair = { stiffness: number; damping: number };

const INSTANT_SPRING = { stiffness: 10000, damping: 500, restDelta: 0.01 };

/** Spring-smoothed scroll progress — instant when reduced motion or instant=true */
export function useSmoothProgress(
  progress: MotionValue<number>,
  stiffnessOrPreset: number | SpringPair = 80,
  damping = 26,
  instant = false,
) {
  const reduced = usePrefersReducedMotion();
  const resolved =
    typeof stiffnessOrPreset === 'number'
      ? { stiffness: stiffnessOrPreset, damping }
      : stiffnessOrPreset;

  return useSpring(
    progress,
    reduced || instant ? INSTANT_SPRING : { ...resolved, restDelta: 0.012 },
  );
}
