'use client';

import { useScroll, useTransform } from 'framer-motion';
import { PARALLAX_SPRING } from '../hooks/useParallax';
import { useSmoothProgress } from '../hooks/useSmoothProgress';
import { LandingFoodStoryRail } from './LandingFoodStoryRail';
import { LandingSectionNav } from './LandingSectionNav';
import { ParallaxMotion } from './ParallaxMotion';

/** Fixed scroll UI + page-level ambient motion tied to document progress */
export function LandingMotionChrome() {
  const { scrollYProgress } = useScroll();
  const smooth = useSmoothProgress(scrollYProgress, PARALLAX_SPRING.crisp);
  const fieldY = useTransform(smooth, [0, 1], ['-8%', '28%']);
  const fieldX = useTransform(smooth, [0, 1], ['-4%', '6%']);
  const fieldOpacity = useTransform(smooth, [0, 0.25, 0.75, 1], [0.22, 0.14, 0.14, 0.2]);
  const fieldBackY = useTransform(smooth, [0, 1], ['6%', '-18%']);
  const gridY = useTransform(smooth, [0, 1], ['-5%', '8%']);
  const gridOpacity = useTransform(smooth, [0, 0.3, 0.7, 1], [0, 0.12, 0.12, 0.08]);

  return (
    <>
      <div className="landing-page-ambient" aria-hidden>
        <ParallaxMotion
          modes={['shift-y', 'fade']}
          y={gridY}
          opacity={gridOpacity}
          className="landing-page-ambient__grid"
        />
        <ParallaxMotion
          modes={['shift-y', 'fade']}
          y={fieldBackY}
          opacity={fieldOpacity}
          className="landing-page-ambient__orb landing-page-ambient__orb--back"
        />
        <ParallaxMotion
          modes={['transform', 'fade']}
          x={fieldX}
          y={fieldY}
          opacity={fieldOpacity}
          className="landing-page-ambient__orb landing-page-ambient__orb--front"
        />
      </div>

      <LandingSectionNav progress={smooth} />
      <LandingFoodStoryRail />
    </>
  );
}
