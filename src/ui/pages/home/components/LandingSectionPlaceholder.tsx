type LandingSectionPlaceholderProps = {
  minHeight?: string;
  id?: string;
};

/** Lightweight shell while below-fold sections hydrate */
export function LandingSectionPlaceholder({ minHeight = 'min(72svh, 36rem)', id }: LandingSectionPlaceholderProps) {
  return (
    <div
      id={id}
      className="landing-section-placeholder landing-section-deferred"
      style={{ minHeight }}
      aria-hidden
    />
  );
}
