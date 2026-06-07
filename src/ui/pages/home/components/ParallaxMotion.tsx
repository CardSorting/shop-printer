'use client';

import { motion, type MotionValue } from 'framer-motion';
import type { CSSProperties, ElementType, ReactNode } from 'react';

type MotionTag = 'div' | 'section' | 'p' | 'blockquote' | 'article' | 'span' | 'li';

export type ParallaxMode =
  | 'transform'
  | 'shift-x'
  | 'shift-y'
  | 'fade'
  | 'filter'
  | 'scale-x'
  | 'height'
  | 'clip';

/** MotionValue is invariant in T — permissive bind type for scroll-driven CSS vars */
export type BindableMotion = MotionValue<any>;

type ParallaxMotionProps = {
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
  as?: MotionTag;
  id?: string;
  'aria-hidden'?: boolean;
  'aria-label'?: string;
  modes?: ParallaxMode[];
  x?: BindableMotion;
  y?: BindableMotion;
  scale?: BindableMotion;
  rotate?: BindableMotion;
  rotateX?: BindableMotion;
  rotateY?: BindableMotion;
  opacity?: BindableMotion;
  filter?: BindableMotion;
  scaleX?: BindableMotion;
  height?: BindableMotion;
  clipPath?: BindableMotion;
};

const MOTION_TAGS: Record<MotionTag, ElementType> = {
  div: motion.div,
  section: motion.section,
  p: motion.p,
  blockquote: motion.blockquote,
  article: motion.article,
  span: motion.span,
  li: motion.li,
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
  style: styleProp,
  as = 'div',
  modes,
  x,
  y,
  scale,
  rotate,
  rotateX,
  rotateY,
  opacity,
  filter,
  scaleX,
  height,
  clipPath,
  ...rest
}: ParallaxMotionProps) {
  const Component = MOTION_TAGS[as];

  const style = {
    ...(x !== undefined && { '--lp-x': x }),
    ...(y !== undefined && { '--lp-y': y }),
    ...(scale !== undefined && { '--lp-scale': scale }),
    ...(rotate !== undefined && { '--lp-rotate': rotate }),
    ...(rotateX !== undefined && { '--lp-rotate-x': rotateX }),
    ...(rotateY !== undefined && { '--lp-rotate-y': rotateY }),
    ...(opacity !== undefined && { '--lp-opacity': opacity }),
    ...(filter !== undefined && { '--lp-filter': filter }),
    ...(scaleX !== undefined && { '--lp-scale-x': scaleX }),
    ...(height !== undefined && { '--lp-height': height }),
    ...(clipPath !== undefined && { '--lp-clip': clipPath }),
    ...styleProp,
  } as CSSProperties;

  const needsParallax =
    x !== undefined ||
    y !== undefined ||
    scale !== undefined ||
    rotate !== undefined ||
    rotateX !== undefined ||
    rotateY !== undefined ||
    opacity !== undefined ||
    filter !== undefined ||
    scaleX !== undefined ||
    height !== undefined ||
    clipPath !== undefined;

  const resolvedModes: ParallaxMode[] = modes ? [...modes] : [];
  if (!resolvedModes.length && needsParallax) {
    if (height !== undefined) resolvedModes.push('height');
    else if (scaleX !== undefined) resolvedModes.push('scale-x');
    else if (opacity !== undefined && x === undefined && y === undefined) resolvedModes.push('fade');
    else if (clipPath !== undefined && !resolvedModes.includes('clip')) resolvedModes.push('clip');
    else resolvedModes.push('transform');
  }
  const parallaxClass = resolvedModes.length ? buildParallaxClass(resolvedModes) : '';

  return (
    <Component className={`${parallaxClass} ${className}`.trim()} style={style} {...rest}>
      {children}
    </Component>
  );
}
