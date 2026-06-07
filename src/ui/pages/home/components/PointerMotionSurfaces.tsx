'use client';

import { motion, useReducedMotion } from 'framer-motion';
import type { ReactNode } from 'react';
import { useRef } from 'react';
import { useElementPointerParallax, useMagneticHover, useTilePointerTilt } from '../hooks/usePointerParallax';
import { ParallaxMotion } from './ParallaxMotion';

type PointerTiltSurfaceProps = {
  children: ReactNode;
  className?: string;
  maxRotate?: number;
};

/** Wrapper that owns pointer-tilt hook + ref — satisfies react-hooks/refs */
export function PointerTiltSurface({ children, className = '', maxRotate = 5.5 }: PointerTiltSurfaceProps) {
  const reduceMotion = useReducedMotion();
  const { ref, rotateX, rotateY, onPointerMove, onPointerLeave } = useTilePointerTilt(maxRotate);

  if (reduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      ref={ref}
      className={className}
      style={{ rotateX, rotateY, transformStyle: 'preserve-3d' }}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
    >
      {children}
    </motion.div>
  );
}

type MagneticSurfaceProps = {
  children: ReactNode;
  className?: string;
  strength?: number;
  enabled?: boolean;
};

/** Wrapper that owns magnetic-hover hook + ref */
export function MagneticSurface({ children, className = '', strength = 10, enabled = true }: MagneticSurfaceProps) {
  const reduceMotion = useReducedMotion();
  const { ref, x, y, onPointerMove, onPointerLeave } = useMagneticHover(strength);

  if (!enabled || reduceMotion) {
    return <span className={className}>{children}</span>;
  }

  return (
    <motion.span
      ref={ref}
      className={className}
      style={{ x, y }}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
    >
      {children}
    </motion.span>
  );
}

type ElementPointerSurfaceProps = {
  children: ReactNode;
  className?: string;
  innerClassName?: string;
  strength?: number;
  stiffness?: number;
  damping?: number;
};

/** Bounds-aware pointer drift — ref owned inside wrapper */
export function ElementPointerSurface({
  children,
  className = '',
  innerClassName = '',
  strength = 4,
  stiffness = 80,
  damping = 16,
}: ElementPointerSurfaceProps) {
  const reduceMotion = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const { x, y } = useElementPointerParallax(ref, { strength, stiffness, damping });

  if (reduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div ref={ref} className={className}>
      <ParallaxMotion modes={['transform']} x={x} y={y} className={innerClassName}>
        {children}
      </ParallaxMotion>
    </div>
  );
}
