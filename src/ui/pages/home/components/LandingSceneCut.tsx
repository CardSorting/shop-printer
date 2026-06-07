import { LandingGradientOverlay } from './LandingGradientOverlay';

type LandingSceneCutProps = {
  from: string;
  to: string;
  title: string;
  subtitle?: string;
  compact?: boolean;
};

export function LandingSceneCut({
  from,
  to,
  title,
  subtitle,
  compact = false,
}: LandingSceneCutProps) {
  return (
    <div
      className={`landing-scene-cut${compact ? ' landing-scene-cut--compact' : ''} landing-section-deferred`}
      aria-hidden
    >
      <LandingGradientOverlay variant="scene-cut" />

      <div className="landing-scene-cut__inner landing-scene-cut__inner--enter">
        <p className="landing-scene-cut__chapters">
          <span>{from}</span>
          <span className="landing-scene-cut__arrow" aria-hidden />
          <span>{to}</span>
        </p>

        <div className="landing-scene-cut__wipe landing-scene-cut__wipe--static" aria-hidden />

        <h2 className="landing-scene-cut__title font-display">{title}</h2>
        {subtitle && <p className="landing-scene-cut__subtitle">{subtitle}</p>}
      </div>
    </div>
  );
}
