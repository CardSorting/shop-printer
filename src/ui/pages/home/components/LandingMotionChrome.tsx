'use client';

import { useScroll, useTransform } from 'framer-motion';
import { PARALLAX_SPRING } from '../hooks/useParallax';
import { usePointerParallax } from '../hooks/usePointerParallax';
import { useSmoothProgress } from '../hooks/useSmoothProgress';
import { LandingCinematicOverlay } from './LandingCinematicOverlay';
import { LandingFoodStoryRail } from './LandingFoodStoryRail';
import { ParallaxMotion } from './ParallaxMotion';

/** Fixed scroll UI + page-level ambient motion tied to document progress */
export function LandingMotionChrome() {
  const { scrollYProgress } = useScroll();
  const smooth = useSmoothProgress(scrollYProgress, PARALLAX_SPRING.crisp);
  const pointer = usePointerParallax({ strength: 2.8, stiffness: 34, damping: 20 });

  const fieldY = useTransform(smooth, [0, 1], ['-8%', '28%']);
  const fieldX = useTransform(smooth, [0, 1], ['-4%', '6%']);
  const fieldOpacity = useTransform(smooth, [0, 0.25, 0.75, 1], [0.22, 0.14, 0.14, 0.2]);
  const fieldBackY = useTransform(smooth, [0, 1], ['6%', '-18%']);
  const gridY = useTransform(smooth, [0, 1], ['-5%', '8%']);
  const gridOpacity = useTransform(smooth, [0, 0.3, 0.7, 1], [0, 0.12, 0.12, 0.08]);
  const gridX = useTransform(smooth, [0, 1], ['-3%', '4%']);

  return (
    <>
      <LandingCinematicOverlay />
      <div className="landing-page-ambient" aria-hidden>
        <ParallaxMotion
          modes={['transform', 'fade']}
          x={gridX}
          y={gridY}
          opacity={gridOpacity}
          className="landing-page-ambient__grid"
        />
        <ParallaxMotion
          modes={['transform', 'fade']}
          x={pointer.back.x}
          y={fieldBackY}
          opacity={fieldOpacity}
          className="landing-page-ambient__orb landing-page-ambient__orb--back"
        />
        <ParallaxMotion
          modes={['transform', 'fade']}
          x={fieldX}
          y={fieldY}
          opacity={fieldOpacity}
          className="landing-page-ambient__orb landing-page-ambient__orb--mid"
        />
        <ParallaxMotion
          modes={['transform', 'fade']}
          x={pointer.fore.x}
          y={pointer.fore.y}
          opacity={fieldOpacity}
          className="landing-page-ambient__orb landing-page-ambient__orb--front"
        />
      </div>

      <LandingFoodStoryRail />
    </>
  );
}
