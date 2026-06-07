'use client';

import { useScroll, useTransform } from 'framer-motion';
import { PARALLAX_SPRING } from '../hooks/useParallax';
import { useSmoothProgress } from '../hooks/useSmoothProgress';
import { ParallaxMotion } from './ParallaxMotion';

/** Document-level gradient seam with drift — sits between hero and vendors */
export function LandingSectionBridge() {
  const { scrollYProgress } = useScroll();
  const smooth = useSmoothProgress(scrollYProgress, PARALLAX_SPRING.crisp);
  const opacity = useTransform(smooth, [0.04, 0.12, 0.88, 0.96], [0, 0.72, 0.72, 0]);
  const scaleX = useTransform(smooth, [0, 0.35, 0.5, 0.65, 1], [0.35, 1.08, 1, 0.92, 0.75]);
  const y = useTransform(smooth, [0, 1], ['1.1rem', '-1.1rem']);
  const x = useTransform(smooth, [0, 1], ['-3.5%', '3.5%']);
  const glowOpacity = useTransform(smooth, [0.06, 0.14, 0.5, 0.86, 0.94], [0, 0.62, 0.72, 0.62, 0]);
  const glowScale = useTransform(smooth, [0.08, 0.22, 0.5], [0.6, 1.15, 1]);
  const sparkleOpacity = useTransform(smooth, [0.05, 0.11, 0.48, 0.82, 0.92], [0, 0.55, 0.65, 0.45, 0]);
  const sparkleScaleX = useTransform(smooth, [0, 0.28, 0.52, 0.78, 1], [0.2, 1.12, 0.95, 0.88, 0.6]);
  const sparkleY = useTransform(smooth, [0, 1], ['0.35rem', '-0.55rem']);
  const sparkleX = useTransform(smooth, [0, 1], ['2%', '-2%']);

  return (
    <div className="landing-section-bridge-wrap landing-section-bridge-wrap--cinematic" aria-hidden>
      <ParallaxMotion
        modes={['transform', 'fade', 'scale-x']}
        x={x}
        y={y}
        scale={glowScale}
        opacity={glowOpacity}
        className="landing-section-bridge__glow"
      />
      <ParallaxMotion
        modes={['transform', 'fade', 'scale-x']}
        x={sparkleX}
        y={sparkleY}
        opacity={sparkleOpacity}
        scaleX={sparkleScaleX}
        className="landing-section-bridge__sparkle"
      />
      <ParallaxMotion
        modes={['transform', 'fade', 'scale-x']}
        x={x}
        y={y}
        opacity={opacity}
        scaleX={scaleX}
        className="landing-section-bridge landing-section-bridge--cinematic"
      />
    </div>
  );
}
