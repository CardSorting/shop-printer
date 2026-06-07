'use client';

import type { CSSProperties } from 'react';
import { useScroll, useTransform } from 'framer-motion';
import { PARALLAX_SPRING } from '../hooks/useParallax';
import { useSmoothProgress } from '../hooks/useSmoothProgress';
import { ParallaxMotion } from './ParallaxMotion';

/** Fixed film vignette — scroll-linked edge darkening for the homepage */
export function LandingCinematicOverlay() {
  const { scrollYProgress } = useScroll();
  const smooth = useSmoothProgress(scrollYProgress, PARALLAX_SPRING.cinematic);

  const vignetteStrength = useTransform(smooth, [0, 0.08, 0.35, 0.72, 1], [0.38, 0.52, 0.62, 0.58, 0.48]);

  return (
    <ParallaxMotion
      modes={['fade']}
      opacity={vignetteStrength}
      className="landing-cinema-vignette"
      aria-hidden
      style={{ '--cinema-vignette': 1 } as CSSProperties}
    />
  );
}
