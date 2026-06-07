'use client';

import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import type { MouseEvent, ReactNode } from 'react';
import { SPRING_CONFIG } from '@ui/animations';
import { MICRO_SPRING_SNAPPY } from './MicroMotion';
import { MagneticSurface } from './PointerMotionSurfaces';

type HallCtaProps = {
  href: string;
  label: string;
  variant?: 'primary' | 'secondary' | 'ghost' | 'text';
  className?: string;
  icon?: ReactNode;
  dark?: boolean;
  magnetic?: boolean;
  onClick?: (event: MouseEvent<HTMLAnchorElement>) => void;
};

const CTA_HOVER = { y: -3, scale: 1.015, transition: MICRO_SPRING_SNAPPY };
const CTA_TAP = { scale: 0.975, y: 0, transition: { duration: 0.1 } };

export function HallCta({
  href,
  label,
  variant = 'primary',
  className = '',
  icon,
  dark = false,
  magnetic = true,
  onClick,
}: HallCtaProps) {
  const reduceMotion = useReducedMotion();
  const useMagnetic = magnetic && !reduceMotion && variant !== 'text';

  const motionProps = reduceMotion
    ? {}
    : {
        whileHover: CTA_HOVER,
        whileTap: CTA_TAP,
      };

  return (
    <motion.span className="hall-cta-wrap inline-flex" {...motionProps}>
      <MagneticSurface
        className="hall-cta-magnetic inline-flex"
        strength={variant === 'primary' ? 11 : 7}
        enabled={useMagnetic}
      >
        <Link
          href={href}
          onClick={onClick}
          className={`hall-cta hall-cta--${variant} ${dark ? 'hall-cta--dark' : ''} ${className}`.trim()}
        >
          {variant === 'primary' && <span className="hall-cta__shimmer" aria-hidden />}
          <span className="hall-cta__label">{label}</span>
          {icon && (
            <motion.span
              className="hall-cta__icon"
              aria-hidden
              {...(reduceMotion
                ? {}
                : {
                    initial: false,
                    whileHover: { x: 3 },
                    transition: SPRING_CONFIG,
                  })}
            >
              {icon}
            </motion.span>
          )}
        </Link>
      </MagneticSurface>
    </motion.span>
  );
}
