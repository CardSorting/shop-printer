'use client';

import { motion } from '../motion';
import { type MotionValue } from 'framer-motion';
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

/** MotionValue is invariant in T — permissive bind type for scroll-driven motion */
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
  scaleX?: BindableMotion;
  scaleY?: BindableMotion;
  rotate?: BindableMotion;
  rotateX?: BindableMotion;
  rotateY?: BindableMotion;
  opacity?: BindableMotion;
  filter?: BindableMotion;
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

/**
 * Scroll/pointer-driven motion via Framer's compositor props (x/y/scale/opacity).
 * Avoids CSS custom-property updates — much cheaper per frame than --lp-* vars.
 */
export function ParallaxMotion({
  children,
  className = '',
  style: styleProp,
  as = 'div',
  modes = [],
  x,
  y,
  scale,
  scaleX,
  scaleY,
  rotate,
  rotateX,
  rotateY,
  opacity,
  filter,
  height,
  clipPath,
  ...rest
}: ParallaxMotionProps) {
  const Component = MOTION_TAGS[as];
  const applyX = modes.includes('transform') || modes.includes('shift-x');
  const applyY = modes.includes('transform') || modes.includes('shift-y');
  const usesTransform = applyX || applyY || modes.includes('transform') || modes.includes('scale-x') || scaleY !== undefined;

  const motionStyle = {
    ...styleProp,
    ...(modes.includes('filter') && filter !== undefined ? { filter } : {}),
    ...(modes.includes('clip') && clipPath !== undefined ? { clipPath } : {}),
    ...(modes.includes('height') && height !== undefined ? { height } : {}),
  } as CSSProperties;

  const motionProps: Record<string, BindableMotion | number | string | undefined> = {};
  if (applyX && x !== undefined) motionProps.x = x;
  if (applyY && y !== undefined) motionProps.y = y;
  if (modes.includes('transform')) {
    if (scale !== undefined) motionProps.scale = scale;
    if (rotate !== undefined) motionProps.rotate = rotate;
    if (rotateX !== undefined) motionProps.rotateX = rotateX;
    if (rotateY !== undefined) motionProps.rotateY = rotateY;
  }
  if (modes.includes('scale-x') && scaleX !== undefined) motionProps.scaleX = scaleX;
  if (scaleY !== undefined) motionProps.scaleY = scaleY;
  if (modes.includes('fade') && opacity !== undefined) motionProps.opacity = opacity;

  return (
    <Component
      className={`landing-parallax${usesTransform ? ' landing-parallax--gpu' : ''} ${className}`.trim()}
      style={motionStyle}
      {...motionProps}
      {...rest}
    >
      {children}
    </Component>
  );
}
