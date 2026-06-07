'use client';

import { motion } from '../motion';
import { type MotionValue } from 'framer-motion';
import { LANDING_COPY } from '../copy';
import { useLandingActiveSection } from '../hooks/useLandingActiveSection';
import { useThrottledMotionPercent } from '../hooks/useThrottledMotionValue';

type LandingScrollTickerProps = {
  progress: MotionValue<number>;
};

/** Fixed bottom ticker — throttled scroll depth, shared section observer */
export function LandingScrollTicker({ progress }: LandingScrollTickerProps) {
  const pct = useThrottledMotionPercent(progress);
  const { activeLabel } = useLandingActiveSection();

  return (
    <motion.div
      className="landing-cinema-ticker"
      aria-hidden
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
    >
      <span className="landing-cinema-ticker__section">{activeLabel}</span>
      <span className="landing-cinema-ticker__sep" aria-hidden />
      <span className="landing-cinema-ticker__pct font-display">{String(pct).padStart(3, '0')}</span>
      <span className="landing-cinema-ticker__unit">{LANDING_COPY.tickerUnit}</span>
    </motion.div>
  );
}
