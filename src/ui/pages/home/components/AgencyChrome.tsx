'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  useMotionValueEvent,
  useSpring,
  useTransform,
  type MotionValue,
} from 'framer-motion';
import { motion } from '../motion';
import type { ReactNode } from 'react';
import { LANDING_COPY, LANDING_SECTIONS } from '../copy';
import { ParallaxMotion, type BindableMotion, type ParallaxMode } from './ParallaxMotion';

/* ── CTAs & stamps ─────────────────────────────────────────────── */

type AgencyCtaProps = {
  href: string;
  label: string;
  variant?: 'primary' | 'ghost' | 'text' | 'outline' | 'magnetic';
  className?: string;
  icon?: ReactNode;
  index?: string;
};

export function AgencyCta({
  href,
  label,
  variant = 'primary',
  className = '',
  icon,
  index,
}: AgencyCtaProps) {
  return (
    <Link
      href={href}
      className={`landing-agency-cta landing-agency-cta--${variant} ${className}`.trim()}
    >
      {index && <span className="landing-agency-cta__index">{index}</span>}
      <span className="landing-agency-cta__label">{label}</span>
      {icon && <span className="landing-agency-cta__icon">{icon}</span>}
      <span className="landing-agency-cta__ring" aria-hidden />
      <span className="landing-agency-cta__line" aria-hidden />
    </Link>
  );
}

type AgencyStampProps = {
  coords?: string;
  className?: string;
  dark?: boolean;
};

export function AgencyStamp({ coords, className = '', dark = false }: AgencyStampProps) {
  return (
    <div
      className={`landing-agency-stamp ${dark ? 'landing-agency-stamp--dark' : ''} ${className}`.trim()}
      aria-hidden
    >
      {coords && <span className="landing-agency-stamp__coords">{coords}</span>}
      <span className="landing-agency-stamp__mark">WB</span>
    </div>
  );
}

type AgencyRailProps = {
  text: string;
  side?: 'left' | 'right';
  parallaxY?: BindableMotion;
};

export function AgencyRail({ text, side = 'left', parallaxY }: AgencyRailProps) {
  return (
    <ParallaxMotion
      className={`landing-agency-rail landing-agency-rail--${side}`}
      modes={parallaxY ? ['shift-y'] : undefined}
      y={parallaxY}
      aria-hidden
    >
      <span>{text}</span>
    </ParallaxMotion>
  );
}

type SectionWatermarkProps = {
  index: string;
  parallaxY?: BindableMotion;
  parallaxX?: BindableMotion;
  dark?: boolean;
};

export function SectionWatermark({ index, parallaxY, parallaxX, dark = false }: SectionWatermarkProps) {
  const modes: ParallaxMode[] =
    parallaxX && parallaxY
      ? ['transform']
      : [...(parallaxY ? (['shift-y'] as const) : []), ...(parallaxX ? (['shift-x'] as const) : [])];

  return (
    <ParallaxMotion
      className={`landing-section-watermark font-display ${dark ? 'landing-section-watermark--dark' : ''}`}
      modes={modes.length ? modes : undefined}
      y={parallaxY}
      x={parallaxX}
      aria-hidden
    >
      {index}
    </ParallaxMotion>
  );
}

type AgencyFrameProps = {
  children: ReactNode;
  className?: string;
};

export function AgencyFrame({ children, className = '' }: AgencyFrameProps) {
  return (
    <div className={`landing-agency-frame ${className}`.trim()}>
      <span className="landing-agency-frame__corner landing-agency-frame__corner--tl" />
      <span className="landing-agency-frame__corner landing-agency-frame__corner--tr" />
      <span className="landing-agency-frame__corner landing-agency-frame__corner--bl" />
      <span className="landing-agency-frame__corner landing-agency-frame__corner--br" />
      {children}
    </div>
  );
}

/* ── Scroll chrome ───────────────────────────────────────────────── */

export { useSmoothProgress } from '../hooks/useSmoothProgress';

type ScrollRailProps = {
  progress: MotionValue<number>;
};

export function ScrollProgressRail({ progress }: ScrollRailProps) {
  const [activeId, setActiveId] = useState<string>(LANDING_SECTIONS[0].id);
  const [pct, setPct] = useState(0);
  const height = useTransform(progress, [0, 1], ['0%', '100%']);

  useMotionValueEvent(progress, 'change', (v) => setPct(Math.round(v * 100)));

  useEffect(() => {
    const observers: IntersectionObserver[] = [];

    LANDING_SECTIONS.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (!el) return;

      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) setActiveId(id);
        },
        { rootMargin: '-40% 0px -40% 0px', threshold: 0 },
      );

      observer.observe(el);
      observers.push(observer);
    });

    return () => observers.forEach((o) => o.disconnect());
  }, []);

  const active = LANDING_SECTIONS.find((s) => s.id === activeId);

  return (
    <nav className="landing-scroll-rail" aria-label="Page sections">
      <span className="landing-scroll-rail__pct">{String(pct).padStart(2, '0')}%</span>
      <div className="landing-scroll-rail__track">
        <ParallaxMotion className="landing-scroll-rail__fill" modes={['height']} height={height} />
      </div>
      <ol className="landing-scroll-rail__list">
        {LANDING_SECTIONS.map(({ id, label }) => (
          <li key={id}>
            <a
              href={`#${id}`}
              className={`landing-scroll-rail__dot ${activeId === id ? 'landing-scroll-rail__dot--active' : ''}`}
              aria-current={activeId === id ? 'true' : undefined}
            >
              <span className="landing-scroll-rail__label">{label}</span>
            </a>
          </li>
        ))}
      </ol>
      {active && <span className="landing-scroll-rail__active">{active.label}</span>}
    </nav>
  );
}

type ScrollTickerProps = {
  progress: MotionValue<number>;
};

export function ScrollTicker({ progress }: ScrollTickerProps) {
  const [pct, setPct] = useState(0);
  const [activeLabel, setActiveLabel] = useState<string>(LANDING_SECTIONS[0].label);

  useMotionValueEvent(progress, 'change', (v) => setPct(Math.round(v * 100)));

  useEffect(() => {
    const observers: IntersectionObserver[] = [];

    LANDING_SECTIONS.forEach(({ id, label }) => {
      const el = document.getElementById(id);
      if (!el) return;

      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) setActiveLabel(label);
        },
        { rootMargin: '-45% 0px -45% 0px', threshold: 0 },
      );

      observer.observe(el);
      observers.push(observer);
    });

    return () => observers.forEach((o) => o.disconnect());
  }, []);

  return (
    <div className="landing-scroll-ticker" aria-hidden>
      <span className="landing-scroll-ticker__section">{activeLabel}</span>
      <span className="landing-scroll-ticker__sep">—</span>
      <span className="landing-scroll-ticker__pct">{String(pct).padStart(3, '0')}</span>
      <span className="landing-scroll-ticker__unit">{LANDING_COPY.tickerUnit}</span>
    </div>
  );
}

type AgencyGridProps = {
  className?: string;
  parallaxX?: BindableMotion;
  parallaxY?: BindableMotion;
  rotate?: BindableMotion;
};

export function AgencyGrid({ className = '', parallaxX, parallaxY, rotate }: AgencyGridProps) {
  const hasMotion = parallaxX || parallaxY || rotate;
  return (
    <ParallaxMotion
      className={`landing-agency-grid ${className}`.trim()}
      modes={hasMotion ? ['transform'] : undefined}
      x={parallaxX}
      y={parallaxY}
      rotate={rotate}
      aria-hidden
    />
  );
}

type AgencyBriefProps = {
  caseStudy: string;
  place: string;
  discipline: string;
  year: string;
};

export function AgencyBrief({ caseStudy, place, discipline, year }: AgencyBriefProps) {
  return (
    <dl className="landing-agency-brief" aria-label="Project brief">
      <div>
        <dt>Case</dt>
        <dd>{caseStudy}</dd>
      </div>
      <div>
        <dt>Place</dt>
        <dd>{place}</dd>
      </div>
      <div>
        <dt>Type</dt>
        <dd>{discipline}</dd>
      </div>
      <div>
        <dt>Year</dt>
        <dd>{year}</dd>
      </div>
    </dl>
  );
}

type SplitRevealProps = {
  children: string;
  className?: string;
  delay?: number;
  accent?: boolean;
};

export function SplitReveal({ children, className = '', delay = 0, accent = false }: SplitRevealProps) {
  return (
    <span className={`landing-split ${accent ? 'landing-split--accent' : ''} ${className}`.trim()}>
      <motion.span
        className="landing-split__inner font-display"
        initial={{ y: '125%', opacity: 0, filter: 'blur(8px)' }}
        animate={{ y: 0, opacity: 1, filter: 'blur(0px)' }}
        transition={{ duration: 1.15, delay, ease: [0.12, 1, 0.28, 1] }}
      >
        {children}
      </motion.span>
    </span>
  );
}
