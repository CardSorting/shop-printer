import { LandingGradientOverlay } from './LandingGradientOverlay';

/** Static gradient seam between hero and vendors */
export function LandingSectionBridge() {
  return (
    <div className="landing-section-bridge-wrap landing-section-bridge-wrap--cinematic" aria-hidden>
      <LandingGradientOverlay variant="bridge" />
    </div>
  );
}
