import { LandingGradientOverlay } from './LandingGradientOverlay';

/** Fixed film vignette + letterbox — pure CSS, no scroll listeners */
export function LandingCinematicOverlay() {
  return (
    <>
      <LandingGradientOverlay variant="vignette" />
      <div className="landing-cinema-grain--static" aria-hidden />
      <div className="landing-cinema-static__letterbox" aria-hidden>
        <div className="landing-cinema-static__bar" />
        <div className="landing-cinema-static__bar" />
      </div>
    </>
  );
}
