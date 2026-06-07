'use client';

import { motion } from '../motion';
import type { ReactNode } from 'react';
import { AnimatePresence, useReducedMotion } from 'framer-motion';
import type { StallCrowdSignal } from '../utils/stallCrowd';
import { MICRO_SPRING_SNAPPY } from './MicroMotion';

type LiveCountdownProps = {
  totalSeconds: number;
  label: string;
  variant?: 'opens' | 'closes' | 'slot';
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

function CountdownUnit({ value, urgent = false }: { value: number; urgent?: boolean }) {
  const reduceMotion = useReducedMotion();

  return (
    <span className={`live-ticker__unit${urgent ? ' live-ticker__unit--urgent' : ''}`}>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={value}
          className="live-ticker__unit-value font-display"
          initial={reduceMotion ? false : { opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduceMotion ? undefined : { opacity: 0, y: 8 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        >
          {pad2(value)}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

function CountdownRing({ progress, urgent = false }: { progress: number; urgent?: boolean }) {
  const radius = 18;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - Math.min(Math.max(progress, 0), 1));

  return (
    <svg className="live-ticker__ring" viewBox="0 0 40 40" aria-hidden>
      <circle className="live-ticker__ring-track" cx="20" cy="20" r={radius} />
      <circle
        className={`live-ticker__ring-fill${urgent ? ' live-ticker__ring-fill--urgent' : ''}`}
        cx="20"
        cy="20"
        r={radius}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
      />
    </svg>
  );
}

/** Minimal second-accurate countdown with ring progress */
export function LiveCountdown({ totalSeconds, label, variant = 'closes', className = '' }: LiveCountdownProps) {
  const { h, m, s, showHours } = splitCountdown(totalSeconds);
  const urgent = variant === 'closes' && totalSeconds <= 3600;
  const ringProgress = variant === 'slot' ? s / 60 : (60 - s) / 60;

  return (
    <div
      className={`live-ticker live-ticker--minimal live-ticker--${variant} ${className}`.trim()}
      role="timer"
      aria-label={`${label}: ${showHours ? `${h} hours ` : ''}${m} minutes ${s} seconds`}
    >
      <CountdownRing progress={ringProgress} urgent={urgent || variant === 'slot'} />
      <div className="live-ticker__body">
        <span className="live-ticker__label">{label}</span>
        <div className="live-ticker__clock">
          {showHours && (
            <>
              <CountdownUnit value={h} urgent={urgent} />
              <span className="live-ticker__sep">:</span>
            </>
          )}
          <CountdownUnit value={m} urgent={urgent} />
          <span className="live-ticker__sep live-ticker__sep--sec">:</span>
          <CountdownUnit value={s} urgent={urgent || variant === 'slot'} />
        </div>
      </div>
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

/** Odometer-style stat with flash on change */
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

/** Activity line with slide swap on each update */
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

/** Animated table capacity bar */
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

/** Inline stall queue pill — lives in counter meta row */
export { StallCrowdChip } from './StallCrowdChip';

type CtaPulseFrameProps = {
  urgencyLevel: 'calm' | 'busy' | 'rush' | 'critical';
  children: ReactNode;
};

/** Subtle pulse ring around CTA — no copy clutter */
export function CtaPulseFrame({ urgencyLevel, children }: CtaPulseFrameProps) {
  const reduceMotion = useReducedMotion();
  const hot = urgencyLevel === 'critical' || urgencyLevel === 'rush';

  return (
    <div className={`cta-pulse-frame${hot ? ' cta-pulse-frame--hot' : ''}`}>
      <motion.div
        className="cta-pulse-frame__inner"
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
        {!reduceMotion && hot && <span className="cta-pulse-frame__ring" aria-hidden />}
        {children}
      </motion.div>
    </div>
  );
}
