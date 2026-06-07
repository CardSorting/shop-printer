'use client';

import dynamic from 'next/dynamic';
import { useRef } from 'react';
import { LANDING_COPY } from '../copy';
import { useHallDaypart } from '../hooks/useHallDaypart';
import { useSimulatedHallPulseInView } from '../hooks/useSimulatedHallPulse';
import { LandingGradientOverlay } from './LandingGradientOverlay';
import { SectionLabel, StudioContainer, StudioHeading } from './StudioShell';
import { VendorsHallStrip } from './VendorsHallStrip';

const CounterParallaxGrid = dynamic(
  () => import('./CounterParallaxGrid').then((m) => ({ default: m.CounterParallaxGrid })),
  { ssr: false },
);

const { vendors, nowBoard } = LANDING_COPY;

export function VendorsSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const { daypart, isOpen } = useHallDaypart();
  const { pulse } = useSimulatedHallPulseInView(nowBoard[daypart].hotCounters, sectionRef);

  return (
    <section
      ref={sectionRef}
      id="landing-vendors"
      className="landing-vendors landing-vendors--hall landing-vendors--cinematic landing-section-deferred"
    >
      <LandingGradientOverlay variant="section-dark" />
      <LandingGradientOverlay variant="section-glow" className="landing-vendors__section-glow" />
      <div className="landing-section-divider landing-section-divider--enter" aria-hidden />
      <span className="landing-hero__cinema-rail landing-hero__cinema-rail--head landing-vendors__cinema-rail" aria-hidden />

      <StudioContainer>
        <div className="landing-vendors__header landing-vendors__header--simple landing-vendors__header--cinematic landing-vendors__header--enter">
          <div className="landing-vendors__header-copy">
            <SectionLabel label={vendors.label} dark hall={false} />

            <div className="landing-vendors__headline-lockup">
              <StudioHeading size="display" className="landing-vendors__title">
                <span className="landing-vendors__headline-line">
                  <span className="landing-vendors__headline-text font-display">{vendors.headline[0]}</span>
                </span>
                <span className="landing-vendors__headline-line">
                  <span className="landing-vendors__headline-text font-display landing-heading__accent-light landing-vendors__headline-accent">
                    {vendors.headline[1]}
                  </span>
                </span>
              </StudioHeading>
            </div>

            <div className="hall-rule landing-vendors__rule" aria-hidden />
            <p className="landing-vendors__lede landing-vendors__lede--inline">{vendors.lede}</p>
            <VendorsHallStrip pulse={pulse} isOpen={isOpen} daypart={daypart} />
          </div>
        </div>

        <div className="landing-vendors__grid-stage">
          <CounterParallaxGrid pulse={pulse} isOpen={isOpen} daypart={daypart} />
        </div>
      </StudioContainer>

      <span className="landing-hero__cinema-rail landing-hero__cinema-rail--foot landing-vendors__cinema-rail" aria-hidden />
      <div className="landing-section-divider landing-section-divider--exit" aria-hidden />
    </section>
  );
}
