'use client';

import { motion, useReducedMotion } from 'framer-motion';

type LandingSceneCutProps = {
  from: string;
  to: string;
  title: string;
  subtitle?: string;
};

export function LandingSceneCut({ from, to, title, subtitle }: LandingSceneCutProps) {
  const reduceMotion = useReducedMotion();

  return (
    <div className="landing-scene-cut" aria-hidden>
      <motion.div
        className="landing-scene-cut__inner"
        initial={reduceMotion ? false : { opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-20%' }}
        transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 380, damping: 32 }}
      >
        <p className="landing-scene-cut__chapters">
          <span>{from}</span>
          <span className="landing-scene-cut__arrow" aria-hidden />
          <span>{to}</span>
        </p>
        <h2 className="landing-scene-cut__title font-display">{title}</h2>
        {subtitle && <p className="landing-scene-cut__subtitle">{subtitle}</p>}
      </motion.div>
    </div>
  );
}
