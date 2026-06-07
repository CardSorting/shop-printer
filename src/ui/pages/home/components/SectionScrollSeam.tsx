'use client';

import { type RefObject } from 'react';
import { useScroll, useTransform } from 'framer-motion';
import { PARALLAX_SPRING } from '../hooks/useParallax';
import { useSmoothProgress } from '../hooks/useSmoothProgress';
import { ParallaxMotion } from './ParallaxMotion';

type ScrollOffset = NonNullable<Parameters<typeof useScroll>[0]>['offset'];

type SectionScrollSeamProps = {
  targetRef: RefObject<HTMLElement | null>;
  className?: string;
  offset?: ScrollOffset;
  variant?: 'light' | 'dark';
};

/** Scroll-scrubbed seam tied to a section entering the viewport */
export function SectionScrollSeam({
  targetRef,
  className = '',
  offset = ['start 92%', 'start 38%'],
  variant = 'dark',
}: SectionScrollSeamProps) {
  const { scrollYProgress } = useScroll({ target: targetRef, offset });
  const smooth = useSmoothProgress(scrollYProgress, PARALLAX_SPRING.crisp);
  const opacity = useTransform(smooth, [0, 0.22, 0.78, 1], [0, 0.8, 0.8, 0]);
  const scaleX = useTransform(smooth, [0, 0.42, 1], [0.28, 1, 0.72]);
  const y = useTransform(smooth, [0, 1], ['1rem', '-0.85rem']);
  const x = useTransform(smooth, [0, 1], ['-3%', '3%']);
  const glowOpacity = useTransform(smooth, [0, 0.35, 0.65, 1], [0, 0.55, 0.55, 0]);

  return (
    <div className={`landing-section-seam landing-section-seam--${variant} ${className}`.trim()} aria-hidden>
      <ParallaxMotion
        modes={['shift-y', 'fade', 'scale-x']}
        y={y}
        opacity={glowOpacity}
        className="landing-section-seam__glow"
      />
      <ParallaxMotion
        modes={['transform', 'fade', 'scale-x']}
        x={x}
        y={y}
        opacity={opacity}
        scaleX={scaleX}
        className="landing-section-seam__line"
      />
    </div>
  );
}
