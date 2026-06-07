'use client';

import { motion } from 'framer-motion';
import { ArrowRight, CalendarDays } from 'lucide-react';
import { SLIDE_UP_VARIANTS } from '@ui/animations';
import { LANDING_COPY } from '../copy';
import { HALL_BEYOND_GROUPS } from '../constants';
import { HallCta } from './HallCta';
import { SectionLabel } from './StudioShell';

const { beyond } = LANDING_COPY;

const COLUMN_INDEX = ['01', '02', '03'] as const;

const COLUMN_STAGGER = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
};

export function HallBeyondSection() {
  return (
    <section id="landing-beyond" className="landing-beyond" aria-labelledby="beyond-heading">
      <div className="landing-beyond__glow" aria-hidden />

      <span className="landing-beyond__watermark font-display" aria-hidden>
        {beyond.index}
      </span>

      <div className="landing-beyond__edge landing-beyond__edge--left" aria-hidden />
      <div className="landing-beyond__edge landing-beyond__edge--right" aria-hidden />

      <div className="landing-beyond__inner">
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
            <span className="landing-beyond__headline-accent">{beyond.headline[1]}</span>
          </h2>
          <span className="hall-rule landing-beyond__rule" aria-hidden />
          <p className="landing-beyond__sub">{beyond.sub}</p>
          <p className="landing-beyond__aside font-display">{beyond.aside}</p>
          <ul className="landing-beyond__modes" aria-label="Room modes">
            {beyond.imageChips.map((chip) => (
              <li key={chip}>{chip}</li>
            ))}
          </ul>
        </motion.header>

        <div className="landing-beyond__energy" aria-hidden>
          <span className="landing-beyond__energy-node">{beyond.timelineStart}</span>
          <span className="landing-beyond__energy-track">
            <span className="landing-beyond__energy-fill" />
            <span className="landing-beyond__energy-dot landing-beyond__energy-dot--1" />
            <span className="landing-beyond__energy-dot landing-beyond__energy-dot--2" />
            <span className="landing-beyond__energy-dot landing-beyond__energy-dot--3" />
          </span>
          <span className="landing-beyond__energy-node landing-beyond__energy-node--mid">{beyond.timelineMid}</span>
          <span className="landing-beyond__energy-track landing-beyond__energy-track--short">
            <span className="landing-beyond__energy-fill landing-beyond__energy-fill--late" />
          </span>
          <span className="landing-beyond__energy-node landing-beyond__energy-node--end">{beyond.timelineEnd}</span>
        </div>

        <dl className="landing-beyond__stats">
          {beyond.stats.map((stat) => (
            <div key={stat.label} className="landing-beyond__stat">
              <dt className="landing-beyond__stat-value font-display">{stat.value}</dt>
              <dd className="landing-beyond__stat-label">{stat.label}</dd>
            </div>
          ))}
        </dl>

        <div className="landing-beyond__program-shell hall-glass">
          <div className="landing-beyond__program-head">
            <p className="landing-beyond__program-label">{beyond.programLabel}</p>
            <span className="landing-beyond__program-live">
              <span className="landing-beyond__program-live-dot" aria-hidden />
              Open to bookings
            </span>
          </div>

          <div className="landing-beyond__program">
            {HALL_BEYOND_GROUPS.map((group, groupIndex) => (
              <motion.article
                key={group.id}
                className={`landing-beyond__column landing-beyond__column--${group.id}`}
                initial={COLUMN_STAGGER.initial}
                whileInView={COLUMN_STAGGER.animate}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.65, delay: groupIndex * 0.1, ease: [0.16, 1, 0.3, 1] }}
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
            ))}
          </div>
        </div>

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
      </div>
    </section>
  );
}
