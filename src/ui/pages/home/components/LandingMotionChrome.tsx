import { LandingCinematicOverlay } from './LandingCinematicOverlay';
import { LandingGradientOverlay } from './LandingGradientOverlay';
import { LandingPageCurtain } from './LandingPageCurtain';

/** Fixed cinematic chrome — pure CSS, zero scroll listeners */
export function LandingMotionChrome() {
  return (
    <>
      <LandingPageCurtain />
      <LandingGradientOverlay variant="ambient" />
      <LandingCinematicOverlay />
    </>
  );
}
