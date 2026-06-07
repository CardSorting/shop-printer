type GradientVariant =
  | 'hero'
  | 'hero-vignette'
  | 'hero-cinema'
  | 'section-dark'
  | 'section-glow'
  | 'vignette'
  | 'bridge'
  | 'visit'
  | 'visit-ambient'
  | 'scene-cut'
  | 'food-pass'
  | 'ambient';

type LandingGradientOverlayProps = {
  variant: GradientVariant;
  className?: string;
};

/** Pure CSS cinematic gradients — no scroll listeners, no compositor churn */
export function LandingGradientOverlay({ variant, className = '' }: LandingGradientOverlayProps) {
  return (
    <div
      className={`landing-gradient landing-gradient--${variant} ${className}`.trim()}
      aria-hidden
    />
  );
}
