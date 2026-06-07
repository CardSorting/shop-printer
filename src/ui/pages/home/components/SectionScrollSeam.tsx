'use client';

import { type RefObject } from 'react';
import { useScroll, useTransform, type MotionValue } from 'framer-motion';
import { SCROLL_OPTS } from '../hooks/useParallax';
import { ParallaxMotion } from './ParallaxMotion';

type ScrollOffset = NonNullable<Parameters<typeof useScroll>[0]>['offset'];

type SectionScrollSeamBaseProps = {
  phase?: 'enter' | 'exit';
  className?: string;
  variant?: 'light' | 'dark';
};

type SectionScrollSeamWithProgress = SectionScrollSeamBaseProps & {
  progress: MotionValue<number>;
  targetRef?: never;
  offset?: never;
};

type SectionScrollSeamWithTarget = SectionScrollSeamBaseProps & {
  progress?: never;
  targetRef: RefObject<HTMLElement | null>;
  offset?: ScrollOffset;
};

type SectionScrollSeamProps = SectionScrollSeamWithProgress | SectionScrollSeamWithTarget;

function SectionScrollSeamInner({
  progress,
  phase = 'enter',
  className = '',
  variant = 'dark',
}: SectionScrollSeamBaseProps & { progress: MotionValue<number> }) {
  const opacityInput = phase === 'exit' ? [0.86, 0.94] : [0.06, 0.14];
  const opacity = useTransform(progress, opacityInput, [0, 0.75]);
  const scaleInput = phase === 'exit' ? [0.88, 0.96, 1] : [0, 0.08, 0.18];
  const scaleX = useTransform(progress, scaleInput, [0.28, 1, 0.72]);

  return (
    <div
      className={`landing-section-seam landing-section-seam--${variant} ${className}`.trim()}
      aria-hidden
    >
      <ParallaxMotion
        modes={['fade', 'scale-x']}
        opacity={opacity}
        scaleX={scaleX}
        className="landing-section-seam__line"
      />
    </div>
  );
}

function SectionScrollSeamWithTarget({
  targetRef,
  offset = ['start 92%', 'start 38%'],
  ...rest
}: SectionScrollSeamWithTarget) {
  const { scrollYProgress } = useScroll({ target: targetRef, offset, ...SCROLL_OPTS });
  return <SectionScrollSeamInner progress={scrollYProgress} {...rest} />;
}

/** Scroll-scrubbed seam — pass section progress to avoid duplicate scroll listeners */
export function SectionScrollSeam(props: SectionScrollSeamProps) {
  if ('progress' in props && props.progress) {
    const { progress, ...rest } = props;
    return <SectionScrollSeamInner progress={progress} {...rest} />;
  }

  const { targetRef, offset, ...rest } = props as SectionScrollSeamWithTarget;
  return <SectionScrollSeamWithTarget targetRef={targetRef} offset={offset} {...rest} />;
}
