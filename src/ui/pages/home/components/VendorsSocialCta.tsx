'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { motion, useReducedMotion, type Variants } from 'framer-motion';
import { ArrowRight, Flame, Users } from 'lucide-react';
import { LANDING_COPY } from '../copy';
import { getCounterHref, HALL_COUNTERS } from '../constants';
import { useHallDaypart } from '../hooks/useHallDaypart';
import type { SimulatedHallPulse } from '../hooks/useSimulatedHallPulse';
import { HallCta } from './HallCta';
import { HallLiveMetrics } from './HallLiveMetrics';
import { HallCtaGlow } from './HallLiveTickers';
import { TickerFlip } from './MicroMotion';

const { vendors, nowBoard } = LANDING_COPY;
const { social } = vendors;

const PANEL_VARIANTS: Variants = {
  initial: { opacity: 0, y: 20, scale: 0.97 },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.72, ease: [0.16, 1, 0.3, 1], delay: 0.12 },
  },
};

const CHIP_STAGGER: Variants = {
  initial: {},
  animate: {
    transition: { staggerChildren: 0.06, delayChildren: 0.28 },
  },
};

const CHIP: Variants = {
  initial: { opacity: 0, y: 10, scale: 0.92 },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.48, ease: [0.16, 1, 0.3, 1] },
  },
};

type VendorsSocialCtaProps = {
  className?: string;
  pulse: SimulatedHallPulse;
  isOpen?: boolean | null;
};

export function VendorsSocialCta({ className = '', pulse, isOpen: isOpenProp }: VendorsSocialCtaProps) {
  const reduceMotion = useReducedMotion();
  const { daypart, isOpen: isOpenHook } = useHallDaypart();
  const isOpen = isOpenProp ?? isOpenHook;

  const board = nowBoard[daypart];
  const hotNames = board.hotCounters;

  const passLines = useMemo(
    () =>
      hotNames.map((name) => {
        const counter = HALL_COUNTERS.find((c) => c.name === name);
        const wait = pulse.hotWaits[name];
        const waitLabel = wait ? ` · ~${wait}${social.waitSuffix}` : '';
        return counter ? `${counter.name} — ${counter.signature}${waitLabel}` : name;
      }),
    [hotNames, pulse.hotWaits],
  );

  const [passIndex, setPassIndex] = useState(0);

  useEffect(() => {
    if (reduceMotion || passLines.length <= 1) return;
    const id = window.setInterval(() => {
      setPassIndex((i) => (i + 1) % passLines.length);
    }, 3200);
    return () => window.clearInterval(id);
  }, [passLines.length, reduceMotion]);

  const ctaLabel = isOpen ? board.cta.label : vendors.cta.label;
  const ctaHref = isOpen ? board.cta.href : vendors.cta.href;
  const liveLabel = isOpen ? social.liveOpen : social.liveClosed;
  const crowdLine = isOpen && pulse.rushLabel ? pulse.rushLabel : isOpen ? `${pulse.guestsOnFloor} on the floor` : social.crowdLine;

  return (
    <div className={`landing-vendors-social-cta ${className}`.trim()}>
      <motion.aside
        className="landing-vendors-social-cta__panel hall-glass"
        variants={reduceMotion ? undefined : PANEL_VARIANTS}
        initial={reduceMotion ? false : 'initial'}
        whileInView={reduceMotion ? undefined : 'animate'}
        viewport={{ once: true, margin: '-40px' }}
        aria-label="Live hall status"
      >
        <div className="landing-vendors-social-cta__live">
          <span
            className={`landing-vendors-social-cta__dot${isOpen ? ' landing-vendors-social-cta__dot--live' : ''}`}
            aria-hidden
          />
          <span className="landing-vendors-social-cta__live-label">{liveLabel}</span>
          {isOpen && (
            <span className="landing-vendors-social-cta__busy-badge">
              <Flame className="h-3 w-3" aria-hidden />
              {[...hotNames].length} counters {social.busyFiring}
            </span>
          )}
          {!isOpen && pulse.opensInLabel && (
            <span className="landing-vendors-social-cta__opens-in font-display">{pulse.opensInLabel}</span>
          )}
        </div>

        <HallLiveMetrics pulse={pulse} isOpen={isOpen === true} variant="panel" />

        <p className="landing-vendors-social-cta__floor-title font-display">{board.title}</p>

        <p className="landing-vendors-social-cta__energy">
          <span className="landing-vendors-social-cta__energy-label">{social.floorEnergy}</span>
          <span className="landing-vendors-social-cta__energy-value">{board.energy}</span>
        </p>

        {isOpen && (
          <motion.ul
            className="landing-vendors-social-cta__hot"
            aria-label="Counters busy right now"
            variants={reduceMotion ? undefined : CHIP_STAGGER}
            initial={reduceMotion ? false : 'initial'}
            whileInView={reduceMotion ? undefined : 'animate'}
            viewport={{ once: true, margin: '-30px' }}
          >
            {hotNames.map((name) => (
              <motion.li key={name} variants={reduceMotion ? undefined : CHIP}>
                <Link href={getCounterHref(name)} className="landing-vendors-social-cta__hot-link">
                  <Flame className="h-3 w-3" aria-hidden />
                  {name}
                  <span className="landing-vendors-social-cta__hot-tag">{social.busyNow}</span>
                  {pulse.hotWaits[name] && (
                    <span className="landing-vendors-social-cta__hot-wait">
                      ~{pulse.hotWaits[name]}
                      {social.waitSuffix}
                    </span>
                  )}
                </Link>
              </motion.li>
            ))}
          </motion.ul>
        )}

        <ul className="landing-vendors-social-cta__signals" aria-label="How the hall works">
          {social.signals.map((signal) => (
            <li key={signal}>{signal}</li>
          ))}
        </ul>
      </motion.aside>

      <div className="landing-vendors-social-cta__action">
        <div className="landing-vendors-social-cta__crowd">
          <Users className="h-3.5 w-3.5" aria-hidden />
          <span>{crowdLine}</span>
        </div>

        <HallCtaGlow urgencyLevel={pulse.urgencyLevel}>
          <HallCta
            href={ctaHref}
            label={ctaLabel}
            variant="primary"
            dark
            className="landing-vendors-social-cta__cta"
            icon={<ArrowRight className="h-4 w-4" />}
          />
        </HallCtaGlow>

        {isOpen && passLines.length > 0 && (
          <div className="landing-vendors-social-cta__pass" aria-live="polite">
            <span className="landing-vendors-social-cta__pass-label">{social.cravingEyebrow}</span>
            <TickerFlip value={passLines[passIndex]} className="landing-vendors-social-cta__pass-value font-display" />
          </div>
        )}
      </div>
    </div>
  );
}
