import { useSpring, type MotionValue } from 'framer-motion';
import { usePrefersReducedMotion } from './usePrefersReducedMotion';

type SpringPair = { stiffness: number; damping: number };

/** Spring-smoothed scroll progress — instant when reduced motion is preferred */
export function useSmoothProgress(
  progress: MotionValue<number>,
  stiffnessOrPreset: number | SpringPair = 80,
  damping = 26,
) {
  const reduced = usePrefersReducedMotion();
  const resolved =
    typeof stiffnessOrPreset === 'number'
      ? { stiffness: stiffnessOrPreset, damping }
      : stiffnessOrPreset;

  return useSpring(
    progress,
    reduced
      ? { stiffness: 10000, damping: 500, restDelta: 0.001 }
      : { ...resolved, restDelta: 0.0008 },
  );
}
