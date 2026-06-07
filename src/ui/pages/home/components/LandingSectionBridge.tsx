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
  const x = useTransform(smooth, [0, 1], ['-2.5%', '2.5%']);
  const glowOpacity = useTransform(smooth, [0.06, 0.14, 0.86, 0.94], [0, 0.45, 0.45, 0]);
  const glowX = useTransform(smooth, [0, 1], ['-4%', '4%']);

  return (
    <div className="landing-section-bridge-wrap" aria-hidden>
      <ParallaxMotion
        modes={['transform', 'fade']}
        x={glowX}
        y={y}
        opacity={glowOpacity}
        className="landing-section-bridge__glow"
      />
      <ParallaxMotion
        modes={['transform', 'fade', 'scale-x']}
        x={x}
        y={y}
        opacity={opacity}
        scaleX={scaleX}
        className="landing-section-bridge"
      />
    </div>
  );
}
