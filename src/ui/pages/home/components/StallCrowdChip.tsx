import type { StallCrowdSignal } from '../utils/stallCrowd';

const MAX_CROWD_BARS = 3;

export function StallCrowdChip({
  signal,
  className = '',
  size = 'sm',
}: {
  signal: StallCrowdSignal;
  className?: string;
  size?: 'sm' | 'md';
}) {
  const { count, level, phrase, label, dots } = signal;
  const showLive = level === 'busy' || level === 'hot';

  return (
    <span
      className={`stall-crowd-chip stall-crowd-chip--${level} stall-crowd-chip--${size} ${className}`.trim()}
      aria-label={label}
    >
      {showLive && <span className="stall-crowd-chip__live" aria-hidden />}
      <span className="stall-crowd-chip__track" aria-hidden>
        {Array.from({ length: MAX_CROWD_BARS }).map((_, i) => (
          <span
            key={i}
            className={`stall-crowd-chip__bar${i < dots ? ' stall-crowd-chip__bar--on' : ''}`}
          />
        ))}
      </span>
      <span className="stall-crowd-chip__text">
        <span className="stall-crowd-chip__count font-display">{count}</span>
        <span className="stall-crowd-chip__phrase">{phrase}</span>
      </span>
    </span>
  );
}
