'use client';

import { TRAFFIC_LIGHT_STYLES, type SeoTrafficLightState } from '@domain/seo/traffic-light';

interface SeoTrafficLightProps {
  state: SeoTrafficLightState;
  showMessage?: boolean;
  compact?: boolean;
}

/** Yoast-style traffic light — green / amber / red at a glance */
export function SeoTrafficLight({ state, showMessage = false, compact = false }: SeoTrafficLightProps) {
  const styles = TRAFFIC_LIGHT_STYLES[state.light];

  return (
    <div className={`flex items-start gap-2.5 ${compact ? '' : 'rounded-xl border bg-gray-50/50 p-3'}`}>
      <span
        className={`mt-0.5 h-3 w-3 shrink-0 rounded-full ring-4 ${styles.dot} ${styles.ring}`}
        aria-hidden
      />
      <div className="min-w-0">
        <p className={`text-[10px] font-black uppercase tracking-widest ${styles.text}`}>{state.label}</p>
        {showMessage && !compact && (
          <p className="mt-0.5 text-[11px] leading-relaxed text-gray-600">{state.merchantMessage}</p>
        )}
      </div>
    </div>
  );
}
