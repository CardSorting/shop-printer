'use client';

import { motion } from '../motion';
import { useReducedMotion } from 'framer-motion';
import { MICRO_SPRING_SNAPPY } from './MicroMotion';

type SectionLabelMotionProps = {
  label: string;
  index?: string;
  dark?: boolean;
  hall?: boolean;
  className?: string;
};

/** Section label with scroll-triggered reveal */
export function SectionLabelMotion({
  index,
  label,
  dark = false,
  hall = true,
  className = '',
}: SectionLabelMotionProps) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      className={`landing-section-label ${hall ? 'landing-section-label--hall' : ''} ${dark ? 'landing-section-label--dark' : ''} ${className}`.trim()}
      initial={reduceMotion ? false : { opacity: 0, x: -10 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={reduceMotion ? { duration: 0 } : { duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
      {...(reduceMotion ? {} : { whileHover: { x: 4, transition: MICRO_SPRING_SNAPPY } })}
    >
      {!hall && index && <span className="landing-section-label__index">{index}</span>}
      {!hall && <span className="landing-section-label__rule" aria-hidden />}
      <span className="landing-section-label__text">{label}</span>
    </motion.div>
  );
}
