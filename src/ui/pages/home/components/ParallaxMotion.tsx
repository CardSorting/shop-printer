'use client';

import { motion, type MotionValue } from 'framer-motion';
import type { CSSProperties, ElementType, ReactNode } from 'react';

type MotionTag = 'div' | 'section' | 'p' | 'blockquote' | 'article';

export type ParallaxMode =
  | 'transform'
  | 'shift-x'
  | 'shift-y'
  | 'fade'
  | 'filter'
  | 'scale-x'
  | 'height';

/** MotionValue is invariant in T — permissive bind type for scroll-driven CSS vars */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type BindableMotion = MotionValue<any>;

type ParallaxMotionProps = {
  children?: ReactNode;
  className?: string;
  as?: MotionTag;
  id?: string;
  'aria-hidden'?: boolean;
  'aria-label'?: string;
  modes?: ParallaxMode[];
  x?: BindableMotion;
  y?: BindableMotion;
  scale?: BindableMotion;
  rotate?: BindableMotion;
  opacity?: BindableMotion;
  filter?: BindableMotion;
  scaleX?: BindableMotion;
  height?: BindableMotion;
};

const MOTION_TAGS: Record<MotionTag, ElementType> = {
  div: motion.div,
  section: motion.section,
  p: motion.p,
  blockquote: motion.blockquote,
  article: motion.article,
};

function buildParallaxClass(modes: ParallaxMode[]): string {
  if (!modes.length) return '';
  const classes = ['landing-parallax'];
  for (const mode of modes) {
    classes.push(`landing-parallax--${mode}`);
  }
  return classes.join(' ');
}

export function ParallaxMotion({
  children,
  className = '',
  as = 'div',
  modes,
  x,
  y,
  scale,
  rotate,
  opacity,
  filter,
  scaleX,
  height,
  ...rest
}: ParallaxMotionProps) {
  const Component = MOTION_TAGS[as];

  const style = {
    ...(x !== undefined && { '--lp-x': x }),
    ...(y !== undefined && { '--lp-y': y }),
    ...(scale !== undefined && { '--lp-scale': scale }),
    ...(rotate !== undefined && { '--lp-rotate': rotate }),
    ...(opacity !== undefined && { '--lp-opacity': opacity }),
    ...(filter !== undefined && { '--lp-filter': filter }),
    ...(scaleX !== undefined && { '--lp-scale-x': scaleX }),
    ...(height !== undefined && { '--lp-height': height }),
  } as CSSProperties;

  const needsParallax =
    x !== undefined ||
    y !== undefined ||
    scale !== undefined ||
    rotate !== undefined ||
    opacity !== undefined ||
    filter !== undefined ||
    scaleX !== undefined ||
    height !== undefined;

  const resolvedModes: ParallaxMode[] = modes ? [...modes] : [];
  if (!resolvedModes.length && needsParallax) {
    if (height !== undefined) resolvedModes.push('height');
    else if (scaleX !== undefined) resolvedModes.push('scale-x');
    else if (opacity !== undefined && x === undefined && y === undefined) resolvedModes.push('fade');
    else resolvedModes.push('transform');
  }
  const parallaxClass = resolvedModes.length ? buildParallaxClass(resolvedModes) : '';

  return (
    <Component className={`${parallaxClass} ${className}`.trim()} style={style} {...rest}>
      {children}
    </Component>
  );
}
