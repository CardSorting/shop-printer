'use client';

import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { LANDING_COPY } from '../copy';
import { useHallDaypart } from '../hooks/useHallDaypart';
import type { SimulatedHallPulse } from '../hooks/useSimulatedHallPulse';
import { HallCta } from './HallCta';

const { vendors, nowBoard } = LANDING_COPY;
const { social, floorBanner } = vendors;

function formatOpensAt(seconds: number): string {
  const safe = Math.max(0, seconds);
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const s = safe % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

type VendorsHallStripProps = {
  pulse: SimulatedHallPulse;
  isOpen?: boolean | null;
  className?: string;
};

/** Single minimalist hall status + CTA — replaces panel, metrics, and floor banner */
export function VendorsHallStrip({ pulse, isOpen: isOpenProp, className = '' }: VendorsHallStripProps) {
  const reduceMotion = useReducedMotion();
  const { daypart, isOpen: isOpenHook } = useHallDaypart();
  const isOpen = isOpenProp ?? isOpenHook;
  const board = nowBoard[daypart];
  const ctaLabel = isOpen ? board.cta.label : vendors.cta.label;
  const ctaHref = isOpen ? board.cta.href : vendors.cta.href;

  return (
    <motion.div
      className={`landing-vendors-strip ${className}`.trim()}
      initial={reduceMotion ? false : { opacity: 0, y: 14 }}
      whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.62, ease: [0.16, 1, 0.3, 1], delay: 0.08 }}
      aria-label="Hall status"
    >
      <div className="landing-vendors-strip__main">
        <div className="landing-vendors-strip__status">
          <span
            className={`landing-vendors-strip__dot${isOpen ? ' landing-vendors-strip__dot--live' : ''}`}
            aria-hidden
          />
          <div className="landing-vendors-strip__copy">
            {!isOpen ? (
              <>
                <p className="landing-vendors-strip__line">
                  <span>{social.liveClosed}</span>
                  <span className="landing-vendors-strip__sep" aria-hidden>
                    ·
                  </span>
                  <time className="landing-vendors-strip__time font-display" dateTime={`PT${pulse.opensInSeconds}S`}>
                    {formatOpensAt(pulse.opensInSeconds)}
                  </time>
                </p>
                <p className="landing-vendors-strip__sub">{social.closedHint}</p>
              </>
            ) : (
              <>
                <p className="landing-vendors-strip__line">
                  <span>{social.liveOpen}</span>
                  <span className="landing-vendors-strip__sep" aria-hidden>
                    ·
                  </span>
                  <span>{board.energy}</span>
                </p>
                <p className="landing-vendors-strip__sub font-display">{board.title}</p>
              </>
            )}
          </div>
        </div>

        <div className="landing-vendors-strip__actions">
          <HallCta
            href={ctaHref}
            label={ctaLabel}
            variant="primary"
            dark
            className="landing-vendors-strip__cta"
            icon={<ArrowRight className="h-4 w-4" />}
          />
          <Link href={floorBanner.secondary.href} className="landing-vendors-strip__link">
            {floorBanner.secondary.label}
          </Link>
        </div>
      </div>

      <p className="landing-vendors-strip__signals">{social.signals.join(' · ')}</p>
    </motion.div>
  );
}
