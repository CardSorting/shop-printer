'use client';

import { motion, useReducedMotion } from 'framer-motion';

/** Brief load curtain — cinematic page open */
export function LandingPageCurtain() {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) return null;

  return (
    <motion.div
      className="landing-page-curtain"
      initial={{ opacity: 1 }}
      animate={{ opacity: 0 }}
      transition={{ duration: 0.85, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
      aria-hidden
    />
  );
}
