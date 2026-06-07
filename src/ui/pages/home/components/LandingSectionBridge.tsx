'use client';

import { useScroll, useTransform } from 'framer-motion';
import { PARALLAX_SPRING } from '../hooks/useParallax';
import { useSmoothProgress } from '../hooks/useSmoothProgress';
import { ParallaxMotion } from './ParallaxMotion';

/** Document-level gradient seam with drift — sits between hero and vendors */
export function LandingSectionBridge() {
  const { scrollYProgress } = useScroll();
  const smooth = useSmoothProgress(scrollYProgress, PARALLAX_SPRING.crisp);
  const opacity = useTransform(smooth, [0.04, 0.12, 0.88, 0.96], [0, 0.55, 0.55, 0]);
  const scaleX = useTransform(smooth, [0, 0.5, 1], [0.55, 1, 0.88]);
  const y = useTransform(smooth, [0, 1], ['0.85rem', '-0.85rem']);
  const glowOpacity = useTransform(smooth, [0.06, 0.14, 0.86, 0.94], [0, 0.45, 0.45, 0]);

  return (
    <div className="landing-section-bridge-wrap" aria-hidden>
      <ParallaxMotion
        modes={['shift-y', 'fade']}
        y={y}
        opacity={glowOpacity}
        className="landing-section-bridge__glow"
      />
      <ParallaxMotion
        modes={['shift-y', 'fade', 'scale-x']}
        y={y}
        opacity={opacity}
        scaleX={scaleX}
        className="landing-section-bridge"
      />
    </div>
  );
}
