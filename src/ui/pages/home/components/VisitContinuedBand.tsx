'use client';

import { useRef, type ReactNode } from 'react';
import { useScroll, useTransform } from 'framer-motion';
import { PARALLAX_SPRING } from '../hooks/useParallax';
import { useSmoothProgress } from '../hooks/useSmoothProgress';
import { ParallaxMotion } from './ParallaxMotion';
import { SectionScrollSeam } from './SectionScrollSeam';
import { StudioContainer } from './StudioShell';

type VisitContinuedBandProps = {
  id: string;
  children: ReactNode;
};

/** Continued visit bands with ambient scroll parallax */
export function VisitContinuedBand({ id, children }: VisitContinuedBandProps) {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });
  const smooth = useSmoothProgress(scrollYProgress, PARALLAX_SPRING.ambient);
  const glowY = useTransform(smooth, [0, 1], ['8%', '-10%']);
  const glowOpacity = useTransform(smooth, [0, 0.45, 1], [0, 0.38, 0.16]);
  const meshX = useTransform(smooth, [0, 1], ['-5%', '5%']);

  return (
    <section id={id} ref={ref} className="landing-visit landing-visit--continued">
      <SectionScrollSeam targetRef={ref} variant="dark" />
      <ParallaxMotion
        modes={['shift-y', 'fade']}
        y={glowY}
        opacity={glowOpacity}
        className="landing-visit__continued-glow"
        aria-hidden
      />
      <ParallaxMotion modes={['shift-x']} x={meshX} className="landing-visit__continued-mesh" aria-hidden />
      <StudioContainer className="landing-visit__inner">{children}</StudioContainer>
    </section>
  );
}
