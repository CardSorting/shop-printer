'use client';

import type { MotionValue } from 'framer-motion';
import type { ReactNode } from 'react';
import { useParallaxX, useParallaxY, useParallaxScale } from '../hooks/useParallax';
import { ParallaxMotion, type ParallaxMode } from './ParallaxMotion';

type ParallaxLayerProps = {
  children: ReactNode;
  progress: MotionValue<number>;
  className?: string;
  y?: [number, number];
  x?: [number, number];
  scale?: [number, number];
  inputRange?: [number, number];
};

function resolveModes(hasX: boolean, hasY: boolean, hasScale: boolean): ParallaxMode[] {
  if (hasX && !hasY && !hasScale) return ['shift-x'];
  if (hasY && !hasX && !hasScale) return ['shift-y'];
  if (hasX || hasY || hasScale) return ['transform'];
  return [];
}

export function ParallaxLayer({
  children,
  progress,
  className = '',
  y,
  x,
  scale,
  inputRange = [0, 1],
}: ParallaxLayerProps) {
  const translateY = useParallaxY(progress, y ?? [0, 0], inputRange);
  const translateX = useParallaxX(progress, x ?? [0, 0], inputRange);
  const scaleVal = useParallaxScale(progress, scale ?? [1, 1], inputRange);
  const modes = resolveModes(Boolean(x), Boolean(y), Boolean(scale));

  return (
    <ParallaxMotion
      className={className}
      modes={modes}
      x={x ? translateX : undefined}
      y={y ? translateY : undefined}
      scale={scale ? scaleVal : undefined}
    >
      {children}
    </ParallaxMotion>
  );
}
