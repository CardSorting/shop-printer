import { useSpring, type MotionValue } from 'framer-motion';

/** Spring-smoothed scroll progress for parallax sections */
export function useSmoothProgress(progress: MotionValue<number>, stiffness = 80, damping = 26) {
  return useSpring(progress, { stiffness, damping, restDelta: 0.0008 });
}
