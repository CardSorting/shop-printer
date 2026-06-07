'use client';

type CounterStallCrowdProps = {
  count: number;
  hot?: boolean;
  className?: string;
};

const MAX_VISIBLE = 5;

/** Minimal SVG silhouettes — stacked crowd at a counter stall */
function StallAvatar({ index, hot }: { index: number; hot: boolean }) {
  const opacity = 0.92 - index * 0.1;

  return (
    <svg
      viewBox="0 0 14 18"
      className="landing-stall-crowd__avatar"
      aria-hidden
      style={{ opacity, zIndex: MAX_VISIBLE - index }}
    >
      <circle cx="7" cy="4.5" r="3.2" fill="currentColor" />
      <path d="M1.5 17.5c1.2-2.8 3.2-4 5.5-4s4.3 1.2 5.5 4" fill="currentColor" />
    </svg>
  );
}

export function CounterStallCrowd({ count, hot = false, className = '' }: CounterStallCrowdProps) {
  if (count <= 0) return null;

  const visible = Math.min(count, MAX_VISIBLE);
  const overflow = count - MAX_VISIBLE;

  return (
    <div
      className={`landing-stall-crowd${hot ? ' landing-stall-crowd--hot' : ''} ${className}`.trim()}
      aria-label={`${count} at counter`}
    >
      <div className="landing-stall-crowd__stack">
        {Array.from({ length: visible }, (_, i) => (
          <StallAvatar key={i} index={i} hot={hot} />
        ))}
      </div>
      {overflow > 0 && <span className="landing-stall-crowd__more">+{overflow}</span>}
    </div>
  );
}
