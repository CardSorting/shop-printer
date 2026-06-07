'use client';

import Link from 'next/link';
import { motion, useMotionValue, useReducedMotion, useTransform, type MotionValue, type Variants } from 'framer-motion';
import { ArrowRight, Flame } from 'lucide-react';
import { LANDING_COPY } from '../copy';
import { getCounterHref } from '../constants';
import { useHallDaypart } from '../hooks/useHallDaypart';
import type { SimulatedHallPulse } from '../hooks/useSimulatedHallPulse';
import { HallCta } from './HallCta';
import { HallLiveMetrics } from './HallLiveMetrics';
import { HallCtaGlow, LiveStatPulse } from './HallLiveTickers';
import { ParallaxMotion } from './ParallaxMotion';

const { vendors, nowBoard } = LANDING_COPY;
const { floorBanner, social } = vendors;

const BANNER_VARIANTS: Variants = {
  initial: { opacity: 0, y: 36 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.82, ease: [0.16, 1, 0.3, 1] },
  },
};

type VendorsFloorBannerProps = {
  progress?: MotionValue<number>;
  pulse: SimulatedHallPulse;
  isOpen?: boolean | null;
};

export function VendorsFloorBanner({ progress, pulse, isOpen: isOpenProp }: VendorsFloorBannerProps) {
  const reduceMotion = useReducedMotion();
  const { daypart, isOpen: isOpenHook } = useHallDaypart();
  const isOpen = isOpenProp ?? isOpenHook;
  const board = nowBoard[daypart];
  const fallbackProgress = useMotionValue(0.65);
  const activeProgress = progress ?? fallbackProgress;
  const bannerY = useTransform(activeProgress, [0.45, 0.85], ['4%', '-3%']);
  const glowOpacity = useTransform(activeProgress, [0.5, 0.75], [0, 0.55]);

  const ctaLabel = isOpen ? board.cta.label : vendors.cta.label;
  const ctaHref = isOpen ? board.cta.href : vendors.cta.href;
  const hotTrack = [...board.hotCounters, ...board.hotCounters];

  return (
    <ParallaxMotion modes={progress ? ['shift-y'] : []} y={progress ? bannerY : undefined} className="landing-vendors-floor-banner">
      <motion.div
        className="landing-vendors-floor-banner__inner hall-glass"
        variants={reduceMotion ? undefined : BANNER_VARIANTS}
        initial={reduceMotion ? false : 'initial'}
        whileInView={reduceMotion ? undefined : 'animate'}
        viewport={{ once: true, margin: '-80px' }}
      >
        {progress && (
          <ParallaxMotion modes={['fade']} opacity={glowOpacity} className="landing-vendors-floor-banner__glow" aria-hidden />
        )}

        <div className="landing-vendors-floor-banner__copy">
          <p className="landing-vendors-floor-banner__eyebrow">
            <span className={`landing-vendors-floor-banner__dot${isOpen ? ' landing-vendors-floor-banner__dot--live' : ''}`} aria-hidden />
            {isOpen ? social.liveOpen : social.liveClosed}
            {isOpen && (
              <>
                <span className="landing-vendors-floor-banner__eyebrow-sep" aria-hidden>·</span>
                <LiveStatPulse value={pulse.guestsOnFloor} className="landing-vendors-floor-banner__eyebrow-stat" size="sm" hot />
                <span>{social.metrics.guests.toLowerCase()}</span>
              </>
            )}
          </p>
          <h3 className="landing-vendors-floor-banner__headline font-display">{floorBanner.headline}</h3>
          <p className="landing-vendors-floor-banner__sub">{floorBanner.sub}</p>

          <HallLiveMetrics pulse={pulse} isOpen={isOpen === true} variant="banner" />

          {isOpen && (
            <div className="landing-vendors-floor-banner__feed" aria-live="polite">
              <span className="landing-vendors-floor-banner__feed-label">{floorBanner.activityLabel}</span>
              <p className="landing-vendors-floor-banner__feed-line">{pulse.activityLine}</p>
            </div>
          )}

          {isOpen && (
            <div className="landing-vendors-floor-banner__marquee" aria-hidden>
              <div className="landing-vendors-floor-banner__marquee-track">
                {hotTrack.map((name, i) => (
                  <span key={`${name}-${i}`} className="landing-vendors-floor-banner__marquee-item">
                    <Flame className="h-3 w-3" aria-hidden />
                    {name}
                    {pulse.hotWaits[name] && (
                      <span className="landing-vendors-floor-banner__marquee-wait">~{pulse.hotWaits[name]}m</span>
                    )}
                    <span className="landing-vendors-floor-banner__marquee-sep" />
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="landing-vendors-floor-banner__actions">
          <HallCtaGlow urgencyLevel={pulse.urgencyLevel}>
            <HallCta
              href={ctaHref}
              label={ctaLabel}
              variant="primary"
              dark
              className="landing-vendors-floor-banner__cta"
              icon={<ArrowRight className="h-4 w-4" />}
            />
          </HallCtaGlow>
          <Link href={floorBanner.secondary.href} className="landing-vendors-floor-banner__secondary">
            {floorBanner.secondary.label}
          </Link>
          <p className="landing-vendors-floor-banner__note">{floorBanner.ctaNote}</p>
        </div>

        {isOpen && (
          <ul className="landing-vendors-floor-banner__hot-rail" aria-label="Jump to busy counters">
            {board.hotCounters.map((name) => (
              <li key={name}>
                <Link href={getCounterHref(name)} className="landing-vendors-floor-banner__hot-link">
                  {name}
                  {pulse.hotWaits[name] && (
                    <span className="landing-vendors-floor-banner__hot-wait">~{pulse.hotWaits[name]}m</span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </motion.div>
    </ParallaxMotion>
  );
}
