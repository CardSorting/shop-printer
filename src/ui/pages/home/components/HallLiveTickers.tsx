'use client';

import type { ReactNode } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { MICRO_SPRING_SNAPPY } from './MicroMotion';

type UrgencyLevel = 'calm' | 'busy' | 'rush' | 'critical';

type LiveCountdownProps = {
  totalSeconds: number;
  label: string;
  variant?: 'opens' | 'closes' | 'slot';
  maxSeconds?: number;
  className?: string;
};

function pad2(n: number): string {
  return String(Math.max(0, n)).padStart(2, '0');
}

function splitCountdown(totalSeconds: number) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return { h, m, s, showHours: h > 0 };
}

function formatTime(totalSeconds: number): string {
  const { h, m, s, showHours } = splitCountdown(totalSeconds);
  return showHours ? `${pad2(h)}:${pad2(m)}:${pad2(s)}` : `${pad2(m)}:${pad2(s)}`;
}

/** Clean countdown — ring for slot, bar for closes/opens */
export function LiveCountdown({
  totalSeconds,
  label,
  variant = 'closes',
  maxSeconds,
  className = '',
}: LiveCountdownProps) {
  const reduceMotion = useReducedMotion();
  const { showHours } = splitCountdown(totalSeconds);
  const display = formatTime(totalSeconds);
  const urgent = variant === 'closes' && totalSeconds <= 3600;
  const progress = maxSeconds ? Math.max(0, Math.min(1, totalSeconds / maxSeconds)) : null;
  const ringRadius = 18;
  const ringCirc = 2 * Math.PI * ringRadius;
  const ringOffset = progress !== null ? ringCirc * (1 - progress) : 0;

  return (
    <div
      className={`live-ticker live-ticker--${variant} live-ticker--minimal ${className}`.trim()}
      role="timer"
      aria-label={`${label}: ${display}`}
    >
      <div className="live-ticker__head">
        <span className="live-ticker__label">{label}</span>
        {variant === 'slot' && progress !== null && (
          <span className="live-ticker__pct" aria-hidden>
            {Math.round(progress * 100)}%
          </span>
        )}
      </div>

      <div className="live-ticker__body">
        {variant === 'slot' && progress !== null && (
          <svg className="live-ticker__ring" viewBox="0 0 44 44" aria-hidden>
            <circle className="live-ticker__ring-track" cx="22" cy="22" r={ringRadius} />
            <motion.circle
              className="live-ticker__ring-fill"
              cx="22"
              cy="22"
              r={ringRadius}
              strokeDasharray={ringCirc}
              initial={false}
              animate={{ strokeDashoffset: ringOffset }}
              transition={reduceMotion ? { duration: 0 } : { duration: 0.35, ease: 'linear' }}
            />
          </svg>
        )}

        <div className="live-ticker__time-wrap">
          <AnimatePresence mode="wait" initial={false}>
            <motion.time
              key={display}
              className={`live-ticker__time font-display${urgent ? ' live-ticker__time--urgent' : ''}`}
              dateTime={`PT${totalSeconds}S`}
              initial={reduceMotion ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            >
              {display}
            </motion.time>
          </AnimatePresence>
          {!showHours && (
            <span className="live-ticker__units" aria-hidden>
              <span>min</span>
              <span>sec</span>
            </span>
          )}
        </div>
      </div>

      {progress !== null && variant !== 'slot' && (
        <div className="live-ticker__track" aria-hidden>
          <motion.div
            className="live-ticker__track-fill"
            initial={false}
            animate={{ scaleX: progress }}
            transition={reduceMotion ? { duration: 0 } : { duration: 0.35, ease: 'linear' }}
          />
        </div>
      )}
    </div>
  );
}

type LiveStatPulseProps = {
  value: number;
  suffix?: string;
  prefix?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  hot?: boolean;
};

export function LiveStatPulse({
  value,
  suffix = '',
  prefix = '',
  className = '',
  size = 'md',
  hot = false,
}: LiveStatPulseProps) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return (
      <span className={`live-stat-pulse live-stat-pulse--${size} ${className}`.trim()}>
        {prefix}
        {value}
        {suffix}
      </span>
    );
  }

  return (
    <motion.span
      key={value}
      className={`live-stat-pulse live-stat-pulse--${size}${hot ? ' live-stat-pulse--hot' : ''} ${className}`.trim()}
      initial={{ opacity: 0, y: 8, scale: 0.92 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={MICRO_SPRING_SNAPPY}
    >
      {prefix}
      {value}
      {suffix}
    </motion.span>
  );
}

type LiveActivityFlashProps = {
  line: string;
  className?: string;
};

export function LiveActivityFlash({ line, className = '' }: LiveActivityFlashProps) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return <p className={className}>{line}</p>;
  }

  return (
    <AnimatePresence mode="wait">
      <motion.p
        key={line}
        className={className}
        initial={{ opacity: 0, x: -12, filter: 'blur(4px)' }}
        animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
        exit={{ opacity: 0, x: 12, filter: 'blur(4px)' }}
        transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
      >
        {line}
      </motion.p>
    </AnimatePresence>
  );
}

type TableFillBarProps = {
  pct: number;
  taken: number;
  total: number;
  left: number;
};

export function TableFillBar({ pct, taken, total, left }: TableFillBarProps) {
  const reduceMotion = useReducedMotion();
  const urgent = pct >= 78;

  return (
    <div className={`live-table-bar${urgent ? ' live-table-bar--urgent' : ''}`}>
      <div className="live-table-bar__head">
        <span className="live-table-bar__label">Tables</span>
        <span className="live-table-bar__value font-display">
          <LiveStatPulse value={taken} size="sm" hot={urgent} />
          <span className="live-table-bar__of">/{total}</span>
          <span className="live-table-bar__left"> · {left} open</span>
        </span>
      </div>
      <div className="live-table-bar__track" aria-hidden>
        <motion.div
          className="live-table-bar__fill"
          initial={false}
          animate={{ width: `${pct}%` }}
          transition={reduceMotion ? { duration: 0 } : { duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
        />
      </div>
    </div>
  );
}

type HallCtaGlowProps = {
  urgencyLevel: UrgencyLevel;
  children: ReactNode;
};

/** Subtle pulse ring on CTA — no extra copy */
export function HallCtaGlow({ urgencyLevel, children }: HallCtaGlowProps) {
  const reduceMotion = useReducedMotion();
  const hot = urgencyLevel === 'critical' || urgencyLevel === 'rush';

  return (
    <div className={`hall-cta-glow hall-cta-glow--${urgencyLevel}`}>
      <motion.div
        className="hall-cta-glow__wrap"
        {...(reduceMotion || !hot
          ? {}
          : {
              animate: {
                boxShadow: [
                  '0 0 0 0 rgb(245 158 11 / 0)',
                  '0 0 0 5px rgb(245 158 11 / 0.1)',
                  '0 0 0 0 rgb(245 158 11 / 0)',
                ],
              },
              transition: { duration: 2.4, repeat: Infinity, ease: 'easeInOut' },
            })}
      >
        {!reduceMotion && hot && <span className="hall-cta-glow__ring" aria-hidden />}
        {children}
      </motion.div>
    </div>
  );
}

/** @deprecated Use HallCtaGlow — text props removed */
export function HallUrgencyStrip({ urgencyLevel, children }: HallCtaGlowProps) {
  return <HallCtaGlow urgencyLevel={urgencyLevel}>{children}</HallCtaGlow>;
}
