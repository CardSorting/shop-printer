'use client';

import type { CSSProperties } from 'react';
import { useScroll, useTransform } from 'framer-motion';
import { PARALLAX_SPRING } from '../hooks/useParallax';
import { useSmoothProgress } from '../hooks/useSmoothProgress';
import { ParallaxMotion } from './ParallaxMotion';

/** Fixed film vignette + letterbox — scroll-linked cinematic chrome */
export function LandingCinematicOverlay() {
  const { scrollYProgress } = useScroll();
  const smooth = useSmoothProgress(scrollYProgress, PARALLAX_SPRING.cinematic);

  const vignetteStrength = useTransform(smooth, [0, 0.08, 0.35, 0.72, 1], [0.42, 0.56, 0.68, 0.62, 0.52]);
  const letterboxHeight = useTransform(smooth, [0, 0.12, 0.28, 0.55, 0.82, 1], ['2.8vh', '3.2vh', '1.4vh', '0.85vh', '1.6vh', '2.4vh']);
  const grainOpacity = useTransform(smooth, [0, 0.2, 0.5, 0.8, 1], [0.28, 0.18, 0.14, 0.16, 0.22]);
  const washOpacity = useTransform(smooth, [0, 0.25, 0.55, 0.85, 1], [0.08, 0.04, 0.06, 0.05, 0.1]);

  return (
    <>
      <ParallaxMotion
        modes={['fade']}
        opacity={vignetteStrength}
        className="landing-cinema-vignette"
        aria-hidden
        style={{ '--cinema-vignette': 1 } as CSSProperties}
      />
      <ParallaxMotion
        modes={['fade']}
        opacity={grainOpacity}
        className="landing-cinema-grain"
        aria-hidden
      />
      <ParallaxMotion
        modes={['fade']}
        opacity={washOpacity}
        className="landing-cinema-wash"
        aria-hidden
      />
      <div className="landing-cinema-letterbox" aria-hidden>
        <ParallaxMotion modes={['height']} height={letterboxHeight} className="landing-cinema-letterbox__bar landing-cinema-letterbox__bar--top" />
        <ParallaxMotion modes={['height']} height={letterboxHeight} className="landing-cinema-letterbox__bar landing-cinema-letterbox__bar--bottom" />
      </div>
      <div className="landing-cinema-scanline" aria-hidden />
    </>
  );
}
