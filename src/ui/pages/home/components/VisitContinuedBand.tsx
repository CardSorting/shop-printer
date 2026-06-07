import type { ReactNode } from 'react';
import { LandingGradientOverlay } from './LandingGradientOverlay';
import { StudioContainer } from './StudioShell';

type VisitContinuedBandProps = {
  id: string;
  children: ReactNode;
};

/** Continued visit bands — static gradient overlays, CSS reveal */
export function VisitContinuedBand({ id, children }: VisitContinuedBandProps) {
  return (
    <section
      id={id}
      className="landing-visit landing-visit--continued landing-visit--cinematic landing-section-deferred"
    >
      <div className="landing-section-divider landing-section-divider--enter" aria-hidden />
      <LandingGradientOverlay variant="section-dark" />
      <LandingGradientOverlay variant="section-glow" />
      <StudioContainer className="landing-visit__inner">
        <div className="landing-visit-band--enter">{children}</div>
      </StudioContainer>
    </section>
  );
}
