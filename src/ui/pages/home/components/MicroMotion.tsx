'use client';

import { AnimatePresence, motion, useMotionValue, useReducedMotion, type HTMLMotionProps, type Transition, type Variants } from 'framer-motion';
import type { MotionValue } from 'framer-motion';
import type { ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { useStaggeredParallaxX, useStaggeredParallaxY } from '../hooks/useParallax';
import { ParallaxMotion } from './ParallaxMotion';

/** Shared springs for landing micro-interactions */
export const MICRO_SPRING: Transition = { type: 'spring', stiffness: 440, damping: 28, mass: 0.62 };
export const MICRO_SPRING_SNAPPY: Transition = { type: 'spring', stiffness: 560, damping: 34, mass: 0.55 };

export const CARD_LIFT_HOVER = { y: -5, transition: MICRO_SPRING };
export const CARD_LIFT_SUBTLE = { y: -3, transition: MICRO_SPRING };
export const CARD_TAP = { scale: 0.985, y: 0, transition: { duration: 0.11 } };
export const ROW_SHIFT_HOVER = { x: 6, transition: MICRO_SPRING_SNAPPY };
export const CHIP_POP_HOVER = { scale: 1.04, y: -1, transition: MICRO_SPRING_SNAPPY };
export const STAT_POP_HOVER = { scale: 1.05, y: -2, transition: MICRO_SPRING_SNAPPY };
export const LINK_HOVER = { y: -2, scale: 1.01, transition: MICRO_SPRING_SNAPPY };
export const ICON_POP_HOVER = { scale: 1.14, rotate: -6, transition: MICRO_SPRING_SNAPPY };

const DETAIL_ROW_VARIANTS = {
  rest: { x: 0 },
  hover: { x: 6, transition: MICRO_SPRING_SNAPPY },
};

const DETAIL_ICON_VARIANTS = {
  rest: { scale: 1, rotate: 0 },
  hover: { scale: 1.12, rotate: -5, transition: MICRO_SPRING_SNAPPY },
};

type HoverLiftProps = {
  children: ReactNode;
  className?: string;
  lift?: number;
  scale?: number;
} & Omit<HTMLMotionProps<'div'>, 'children'>;

/** Spring lift on hover — cards, panels, tiles */
export function HoverLift({ children, className = '', lift = -5, scale = 1, ...rest }: HoverLiftProps) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      className={className}
      {...rest}
      {...(reduceMotion
        ? {}
        : {
            whileHover: { y: lift, scale, transition: MICRO_SPRING },
            whileTap: CARD_TAP,
          })}
    >
      {children}
    </motion.div>
  );
}

type HoverRowProps = {
  children: ReactNode;
  className?: string;
  shift?: number;
} & Omit<HTMLMotionProps<'li'>, 'children'>;

/** Horizontal nudge for list rows */
export function HoverRow({ children, className = '', shift = 6, ...rest }: HoverRowProps) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.li
      className={className}
      {...rest}
      {...(reduceMotion
        ? {}
        : {
            whileHover: { x: shift, transition: MICRO_SPRING_SNAPPY },
            whileTap: { scale: 0.99, transition: { duration: 0.1 } },
          })}
    >
      {children}
    </motion.li>
  );
}

type PressableProps = {
  children: ReactNode;
  className?: string;
} & Omit<HTMLMotionProps<'button'>, 'children'>;

/** Scale feedback for nav dots and icon buttons */
export function Pressable({ children, className = '', ...rest }: PressableProps) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.button
      className={className}
      {...rest}
      {...(reduceMotion
        ? {}
        : {
            whileHover: { scale: 1.06, transition: MICRO_SPRING_SNAPPY },
            whileTap: { scale: 0.94, transition: { duration: 0.1 } },
          })}
    >
      {children}
    </motion.button>
  );
}

type HoverLinkProps = {
  children: ReactNode;
  className?: string;
} & Omit<HTMLMotionProps<'div'>, 'children'>;

/** Lift wrapper for text links and pill CTAs */
export function HoverLink({ children, className = '', ...rest }: HoverLinkProps) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      className={className}
      {...rest}
      {...(reduceMotion ? {} : { whileHover: LINK_HOVER, whileTap: CARD_TAP })}
    >
      {children}
    </motion.div>
  );
}

type IconPopProps = {
  children: ReactNode;
  className?: string;
};

/** Icon scale + tilt on group hover */
export function IconPop({ children, className = '' }: IconPopProps) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.span
      className={className}
      {...(reduceMotion ? {} : { whileHover: ICON_POP_HOVER })}
    >
      {children}
    </motion.span>
  );
}

type StatPopProps = {
  children: ReactNode;
  className?: string;
} & Omit<HTMLMotionProps<'div'>, 'children'>;

/** Stat cell hover pop */
export function StatPop({ children, className = '', ...rest }: StatPopProps) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      className={className}
      {...rest}
      {...(reduceMotion ? {} : { whileHover: STAT_POP_HOVER, whileTap: CARD_TAP })}
    >
      {children}
    </motion.div>
  );
}

type ModeChipProps = {
  children: ReactNode;
};

/** Mode / tag chip pop */
export function ModeChip({ children }: ModeChipProps) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.span
      {...(reduceMotion ? {} : { whileHover: CHIP_POP_HOVER, whileTap: CARD_TAP })}
    >
      {children}
    </motion.span>
  );
}

type DetailRowProps = {
  icon: ReactNode;
  children: ReactNode;
  className?: string;
};

/** Icon + copy row — parent hover drives icon pop */
export function DetailRow({ icon, children, className = '' }: DetailRowProps) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.li
      className={`landing-detail-row ${className}`.trim()}
      initial="rest"
      animate="rest"
      whileHover={reduceMotion ? undefined : 'hover'}
      variants={DETAIL_ROW_VARIANTS}
      whileTap={reduceMotion ? undefined : { scale: 0.99, transition: { duration: 0.1 } }}
    >
      <motion.span className="landing-detail-row__icon" variants={DETAIL_ICON_VARIANTS}>
        {icon}
      </motion.span>
      <span className="landing-detail-row__copy">{children}</span>
    </motion.li>
  );
}

type TickerFlipProps = {
  value: string | number;
  className?: string;
};

/** Crossfade + slide when ticker value changes */
export function TickerFlip({ value, className = '' }: TickerFlipProps) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return <span className={className}>{value}</span>;
  }

  return (
    <motion.span
      key={String(value)}
      className={className}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={MICRO_SPRING_SNAPPY}
    >
      {value}
    </motion.span>
  );
}

type InfoRowProps = {
  icon: ReactNode;
  label: string;
  detail: string;
  className?: string;
  variants?: Variants;
  transition?: Transition;
  progress?: MotionValue<number>;
  parallaxIndex?: number;
};

/** Label + detail row for route sheets and info lists */
export function InfoRow({
  icon,
  label,
  detail,
  className = '',
  variants,
  transition,
  progress,
  parallaxIndex = 0,
}: InfoRowProps) {
  const reduceMotion = useReducedMotion();
  const fallbackProgress = useMotionValue(0);
  const activeProgress = progress ?? fallbackProgress;
  const y = useStaggeredParallaxY(activeProgress, parallaxIndex, 1, [2, -2.5]);
  const x = useStaggeredParallaxX(activeProgress, parallaxIndex, [-1.25, 1.25]);

  const content = (
    <>
      <span className="landing-info-row__icon">{icon}</span>
      <div className="landing-info-row__body">
        <span className="landing-info-row__label">{label}</span>
        <span className="landing-info-row__detail">{detail}</span>
      </div>
    </>
  );

  return (
    <motion.li
      className={`landing-info-row ${className}`.trim()}
      variants={variants}
      transition={transition}
      initial={variants ? 'initial' : false}
      whileInView={variants ? 'animate' : undefined}
      viewport={variants ? { once: true, margin: '-20px' } : undefined}
      {...(reduceMotion ? {} : { whileHover: ROW_SHIFT_HOVER, whileTap: { scale: 0.99, transition: { duration: 0.1 } } })}
    >
      {progress ? (
        <ParallaxMotion modes={['transform']} x={x} y={y} className="landing-info-row__parallax">
          {content}
        </ParallaxMotion>
      ) : (
        content
      )}
    </motion.li>
  );
}

type CardGridItemProps = {
  children: ReactNode;
  className?: string;
} & Omit<HTMLMotionProps<'li'>, 'children'>;

/** Grid tile wrapper — spring lift for link cards */
export function CardGridItem({ children, className = '', ...rest }: CardGridItemProps) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.li
      className={className}
      {...rest}
      {...(reduceMotion ? {} : { whileHover: CARD_LIFT_SUBTLE, whileTap: CARD_TAP })}
    >
      {children}
    </motion.li>
  );
}

type AccordionRowProps = {
  question: string;
  answer: string;
  open: boolean;
  onToggle: () => void;
  className?: string;
};

/** Expand/collapse FAQ row with height animation */
export function AccordionRow({ question, answer, open, onToggle, className = '' }: AccordionRowProps) {
  const reduceMotion = useReducedMotion();

  return (
    <div className={`landing-first-timer__item ${open ? 'landing-first-timer__item--open' : ''} ${className}`.trim()}>
      <motion.button
        type="button"
        className="landing-first-timer__trigger"
        aria-expanded={open}
        onClick={onToggle}
        {...(reduceMotion
          ? {}
          : {
              whileHover: { x: 4, transition: MICRO_SPRING_SNAPPY },
              whileTap: { scale: 0.99, transition: { duration: 0.1 } },
            })}
      >
        <span>{question}</span>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={reduceMotion ? { duration: 0 } : MICRO_SPRING_SNAPPY}
          aria-hidden
        >
          <ChevronDown className="landing-first-timer__chevron h-4 w-4" />
        </motion.span>
      </motion.button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={reduceMotion ? false : { height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={
              reduceMotion ? { duration: 0 } : { duration: 0.34, ease: [0.16, 1, 0.3, 1] as const }
            }
            style={{ overflow: 'hidden' }}
          >
            <p className="landing-first-timer__answer">{answer}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
