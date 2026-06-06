'use client';

import type { MotionValue } from 'framer-motion';
import type { ReactNode } from 'react';
import { useParallaxX, useParallaxY, useParallaxScale } from '../hooks/useParallax';
import { ParallaxMotion, type BindableMotion, type ParallaxMode } from './ParallaxMotion';

type ParallaxLayerProps = {
  children: ReactNode;
  progress: MotionValue<number>;
  className?: string;
  y?: [number, number];
  x?: [number, number];
  scale?: [number, number];
  inputRange?: [number, number];
};

function resolveModes(
  x: BindableMotion | undefined,
  y: BindableMotion | undefined,
  scale: BindableMotion | undefined,
): ParallaxMode[] {
  if (x !== undefined && y === undefined && scale === undefined) return ['shift-x'];
  if (y !== undefined && x === undefined && scale === undefined) return ['shift-y'];
  if (x !== undefined || y !== undefined || scale !== undefined) return ['transform'];
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
  const translateY = y ? useParallaxY(progress, y, inputRange) : undefined;
  const translateX = x ? useParallaxX(progress, x, inputRange) : undefined;
  const scaleVal = scale ? useParallaxScale(progress, scale, inputRange) : undefined;
  const modes = resolveModes(translateX, translateY, scaleVal);

  return (
    <ParallaxMotion className={className} modes={modes} x={translateX} y={translateY} scale={scaleVal}>
      {children}
    </ParallaxMotion>
  );
}
