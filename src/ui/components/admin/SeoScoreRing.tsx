'use client';

import { TRAFFIC_LIGHT_STYLES } from '@domain/seo/traffic-light';

interface SeoScoreRingProps {
  score: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
  sublabel?: string;
}

function ringColor(score: number): string {
  if (score >= 80) return '#22c55e';
  if (score >= 65) return '#f59e0b';
  return '#ef4444';
}

/** Circular score indicator — familiar from Lighthouse / Yoast dashboards */
export function SeoScoreRing({
  score,
  size = 88,
  strokeWidth = 7,
  label,
  sublabel,
}: SeoScoreRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(100, Math.max(0, score));
  const offset = circumference - (progress / 100) * circumference;
  const color = ringColor(score);

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#f3f4f6"
            strokeWidth={strokeWidth}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-all duration-500"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-black text-gray-900">{score}</span>
        </div>
      </div>
      {label && (
        <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">{label}</p>
      )}
      {sublabel && <p className="max-w-[140px] text-center text-[10px] leading-snug text-gray-400">{sublabel}</p>}
    </div>
  );
}

interface SeoScoreRingPairProps {
  siteScore: number;
  listingScore: number;
  siteHint: string;
  listingHint: string;
}

/** Site vs. listing dual rings — Search Console performance split pattern */
export function SeoScoreRingPair({ siteScore, listingScore, siteHint, listingHint }: SeoScoreRingPairProps) {
  return (
    <div className="grid gap-6 sm:grid-cols-2">
      <div className="flex flex-col items-center rounded-xl border bg-gray-50/50 p-5 text-center">
        <SeoScoreRing score={siteScore} label="Site health" sublabel={siteHint} />
      </div>
      <div className="flex flex-col items-center rounded-xl border bg-gray-50/50 p-5 text-center">
        <SeoScoreRing score={listingScore} label="Listing health" sublabel={listingHint} />
      </div>
    </div>
  );
}

export { TRAFFIC_LIGHT_STYLES };
