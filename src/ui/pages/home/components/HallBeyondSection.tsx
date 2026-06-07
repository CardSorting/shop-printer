'use client';

import { useRef, type ReactNode } from 'react';
import { motion, useScroll, useTransform, type MotionValue } from 'framer-motion';
import { ArrowRight, CalendarDays } from 'lucide-react';
import { SLIDE_UP_VARIANTS } from '@ui/animations';
import { LANDING_COPY } from '../copy';
import { HALL_BEYOND_GROUPS } from '../constants';
import { PARALLAX_SPRING, useDepthLayerY, useScrollScrubFill, useStaggeredParallaxY } from '../hooks/useParallax';
import { useSmoothProgress } from '../hooks/useSmoothProgress';
import { HallCta } from './HallCta';
import { ParallaxMotion } from './ParallaxMotion';
import { SectionScrollSeam } from './SectionScrollSeam';
import { SectionLabel } from './StudioShell';

const { beyond } = LANDING_COPY;

const COLUMN_INDEX = ['01', '02', '03'] as const;

const COLUMN_STAGGER = {
  initial: { opacity: 0, y: 24 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.65, ease: [0.16, 1, 0.3, 1] as const },
  },
};

const COLUMN_SPEEDS = [0.85, 1.15, 1] as const;

function BeyondColumn({
  progress,
  speed,
  children,
  className,
}: {
  progress: MotionValue<number>;
  speed: number;
  children: ReactNode;
  className: string;
}) {
  const y = useDepthLayerY(progress, speed, [
    [0, 5],
    [0.5, 0],
    [1, -6],
  ]);

  return (
    <ParallaxMotion modes={['shift-y']} y={y} className={className}>
      {children}
    </ParallaxMotion>
  );
}

function BeyondModeChip({
  progress,
  index,
  children,
}: {
  progress: MotionValue<number>;
  index: number;
  children: ReactNode;
}) {
  const y = useStaggeredParallaxY(progress, index, 4, [1.5, -1.5]);

  return (
    <ParallaxMotion modes={['shift-y']} y={y} as="li">
      {children}
    </ParallaxMotion>
  );
}

function BeyondStat({
  progress,
  index,
  children,
}: {
  progress: MotionValue<number>;
  index: number;
  children: ReactNode;
}) {
  const y = useStaggeredParallaxY(progress, index, 3, [2.5, -3]);

  return (
    <ParallaxMotion modes={['shift-y']} y={y} className="landing-beyond__stat-wrap">
      {children}
    </ParallaxMotion>
  );
}

export function HallBeyondSection() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });
  const smooth = useSmoothProgress(scrollYProgress, PARALLAX_SPRING.ambient);
  const watermarkY = useTransform(smooth, [0, 1], ['12%', '-18%']);
  const watermarkX = useTransform(smooth, [0, 1], ['8%', '-12%']);
  const glowOpacity = useTransform(smooth, [0, 0.45, 1], [0.55, 1, 0.65]);
  const edgeX = useTransform(smooth, [0, 1], ['-6%', '6%']);
  const edgeRightX = useTransform(smooth, [0, 1], ['6%', '-6%']);
  const programY = useTransform(smooth, [0, 0.5, 1], ['4%', '-1%', '-5%']);
  const programTiltX = useTransform(smooth, [0, 0.55, 1], ['2deg', '0deg', '-1.5deg']);
  const headerY = useTransform(smooth, [0, 1], ['5%', '-4%']);
  const statsY = useTransform(smooth, [0, 1], ['3%', '-3%']);
  const energyX = useTransform(smooth, [0, 1], ['-3%', '3%']);
  const footY = useTransform(smooth, [0, 1], ['4%', '-5%']);
  const glowY = useTransform(smooth, [0, 1], ['-8%', '12%']);
  const energyFill = useScrollScrubFill(smooth, 0.06, 0.48);
  const energyFillLate = useScrollScrubFill(smooth, 0.32, 0.78);
  const headlineAccentX = useTransform(smooth, [0, 1], ['0%', '-3.5%']);

  return (
    <section id="landing-beyond" ref={ref} className="landing-beyond landing-parallax-scene" aria-labelledby="beyond-heading">
      <SectionScrollSeam targetRef={ref} variant="dark" />
      <ParallaxMotion
        modes={['shift-y', 'fade']}
        y={glowY}
        opacity={glowOpacity}
        className="landing-beyond__glow"
        aria-hidden
      />

      <ParallaxMotion
        modes={['transform']}
        x={watermarkX}
        y={watermarkY}
        className="landing-beyond__watermark font-display"
        aria-hidden
      >
        {beyond.index}
      </ParallaxMotion>

      <ParallaxMotion modes={['shift-x']} x={edgeX} className="landing-beyond__edge landing-beyond__edge--left" aria-hidden />
      <ParallaxMotion modes={['shift-x']} x={edgeRightX} className="landing-beyond__edge landing-beyond__edge--right" aria-hidden />

      <div className="landing-beyond__inner">
        <ParallaxMotion modes={['shift-y']} y={headerY}>
        <motion.header
          className="landing-beyond__header"
          initial="initial"
          whileInView="animate"
          viewport={{ once: true, margin: '-80px' }}
          variants={SLIDE_UP_VARIANTS}
        >
          <div className="landing-beyond__header-top">
            <SectionLabel index={beyond.index} label={beyond.label} dark hall />
            <span className="hall-badge landing-beyond__stamp">{beyond.stamp}</span>
          </div>
          <h2 id="beyond-heading" className="landing-beyond__headline font-display">
            {beyond.headline[0]}
            <ParallaxMotion modes={['shift-x']} x={headlineAccentX} as="span" className="landing-beyond__headline-accent">
              {beyond.headline[1]}
            </ParallaxMotion>
          </h2>
          <span className="hall-rule landing-beyond__rule" aria-hidden />
          <p className="landing-beyond__sub">{beyond.sub}</p>
          <p className="landing-beyond__aside font-display">{beyond.aside}</p>
          <ul className="landing-beyond__modes" aria-label="Room modes">
            {beyond.imageChips.map((chip, chipIndex) => (
              <BeyondModeChip key={chip} progress={smooth} index={chipIndex}>
                {chip}
              </BeyondModeChip>
            ))}
          </ul>
        </motion.header>
        </ParallaxMotion>

        <ParallaxMotion modes={['shift-x']} x={energyX}>
        <div className="landing-beyond__energy" aria-hidden>
          <span className="landing-beyond__energy-node">{beyond.timelineStart}</span>
          <span className="landing-beyond__energy-track">
            <ParallaxMotion modes={['scale-x']} scaleX={energyFill} className="landing-beyond__energy-fill" />
            <span className="landing-beyond__energy-dot landing-beyond__energy-dot--1" />
            <span className="landing-beyond__energy-dot landing-beyond__energy-dot--2" />
            <span className="landing-beyond__energy-dot landing-beyond__energy-dot--3" />
          </span>
          <span className="landing-beyond__energy-node landing-beyond__energy-node--mid">{beyond.timelineMid}</span>
          <span className="landing-beyond__energy-track landing-beyond__energy-track--short">
            <ParallaxMotion modes={['scale-x']} scaleX={energyFillLate} className="landing-beyond__energy-fill landing-beyond__energy-fill--late" />
          </span>
          <span className="landing-beyond__energy-node landing-beyond__energy-node--end">{beyond.timelineEnd}</span>
        </div>
        </ParallaxMotion>

        <ParallaxMotion modes={['shift-y']} y={statsY}>
        <dl className="landing-beyond__stats">
          {beyond.stats.map((stat, index) => (
            <BeyondStat key={stat.label} progress={smooth} index={index}>
              <div className="landing-beyond__stat">
                <dt className="landing-beyond__stat-value font-display">{stat.value}</dt>
                <dd className="landing-beyond__stat-label">{stat.label}</dd>
              </div>
            </BeyondStat>
          ))}
        </dl>
        </ParallaxMotion>

        <ParallaxMotion modes={['transform']} y={programY} rotateX={programTiltX} className="landing-beyond__program-shell hall-glass">
          <div className="landing-beyond__program-head">
            <p className="landing-beyond__program-label">{beyond.programLabel}</p>
            <span className="landing-beyond__program-live">
              <span className="landing-beyond__program-live-dot" aria-hidden />
              Open to bookings
            </span>
          </div>

          <div className="landing-beyond__program">
            {HALL_BEYOND_GROUPS.map((group, groupIndex) => (
              <BeyondColumn
                key={group.id}
                progress={smooth}
                speed={COLUMN_SPEEDS[groupIndex]}
                className={`landing-beyond__column landing-beyond__column--${group.id}`}
              >
              <motion.article
                initial={COLUMN_STAGGER.initial}
                whileInView={COLUMN_STAGGER.animate}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.65, delay: groupIndex * 0.1, ease: [0.16, 1, 0.3, 1] as const }}
              >
                <header className="landing-beyond__column-head">
                  <div className="landing-beyond__column-meta">
                    <span className="landing-beyond__column-index">{COLUMN_INDEX[groupIndex]}</span>
                    <h3 className="landing-beyond__column-title font-display">{group.title}</h3>
                  </div>
                  <p className="landing-beyond__column-tagline">{group.tagline}</p>
                </header>
                <ul className="landing-beyond__list">
                  {group.items.map((item, itemIndex) => {
                    const isWildcard = group.id === 'gather' && itemIndex === group.items.length - 1;

                    return (
                      <li
                        key={item.label}
                        className={`landing-beyond__item${isWildcard ? ' landing-beyond__item--wildcard' : ''}`}
                      >
                        <span className="landing-beyond__item-label font-display">{item.label}</span>
                        <span className="landing-beyond__item-detail">{item.detail}</span>
                      </li>
                    );
                  })}
                </ul>
              </motion.article>
              </BeyondColumn>
            ))}
          </div>
        </ParallaxMotion>

        <ParallaxMotion modes={['shift-y']} y={footY}>
        <footer className="landing-beyond__foot hall-glass">
          <div className="landing-beyond__foot-copy">
            <p className="landing-beyond__foot-note font-display">{beyond.footNote}</p>
            <p className="landing-beyond__foot-sub">{beyond.imageCaption}</p>
          </div>
          <div className="landing-beyond__actions">
            <HallCta
              href={beyond.calendar.href}
              label={beyond.calendar.label}
              variant="primary"
              dark
              icon={<CalendarDays className="h-4 w-4" aria-hidden />}
            />
            <HallCta
              href={beyond.host.href}
              label={beyond.host.label}
              variant="ghost"
              icon={<ArrowRight className="h-4 w-4" aria-hidden />}
            />
          </div>
        </footer>
        </ParallaxMotion>
      </div>
    </section>
  );
}
