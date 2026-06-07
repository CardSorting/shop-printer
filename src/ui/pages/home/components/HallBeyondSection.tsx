import { ArrowRight, CalendarDays } from 'lucide-react';
import { LANDING_COPY } from '../copy';
import { HALL_BEYOND_GROUPS } from '../constants';
import { HallCta } from './HallCta';
import { LandingGradientOverlay } from './LandingGradientOverlay';
import { SectionLabel } from './StudioShell';

const { beyond } = LANDING_COPY;

const COLUMN_INDEX = ['01', '02', '03'] as const;

export function HallBeyondSection() {
  return (
    <section id="landing-beyond" className="landing-beyond landing-section-deferred" aria-labelledby="beyond-heading">
      <div className="landing-section-divider landing-section-divider--enter" aria-hidden />
      <LandingGradientOverlay variant="section-dark" />
      <LandingGradientOverlay variant="section-glow" />
      <div className="landing-beyond__glow" aria-hidden />
      <div className="landing-beyond__edge landing-beyond__edge--left" aria-hidden />
      <div className="landing-beyond__edge landing-beyond__edge--right" aria-hidden />

      <div className="landing-beyond__inner">
        <header className="landing-beyond__header landing-beyond__header--enter">
          <div className="landing-beyond__header-top">
            <SectionLabel index={beyond.index} label={beyond.label} dark hall />
            <span className="hall-badge landing-beyond__stamp">{beyond.stamp}</span>
          </div>
          <h2 id="beyond-heading" className="landing-beyond__headline font-display">
            {beyond.headline[0]}
            <span className="landing-beyond__headline-accent">{beyond.headline[1]}</span>
          </h2>
          <div className="hall-rule landing-beyond__rule" aria-hidden />
          <p className="landing-beyond__sub">{beyond.sub}</p>
          <p className="landing-beyond__aside font-display">{beyond.aside}</p>
          <ul className="landing-beyond__modes" aria-label="Room modes">
            {beyond.imageChips.map((chip) => (
              <li key={chip}>{chip}</li>
            ))}
          </ul>
        </header>

        <div className="landing-beyond__energy" aria-hidden>
          <span className="landing-beyond__energy-node">{beyond.timelineStart}</span>
          <span className="landing-beyond__energy-track">
            <span className="landing-beyond__energy-fill landing-beyond__energy-fill--static" />
            <span className="landing-beyond__energy-dot landing-beyond__energy-dot--1" />
            <span className="landing-beyond__energy-dot landing-beyond__energy-dot--2" />
            <span className="landing-beyond__energy-dot landing-beyond__energy-dot--3" />
          </span>
          <span className="landing-beyond__energy-node landing-beyond__energy-node--mid">{beyond.timelineMid}</span>
          <span className="landing-beyond__energy-track landing-beyond__energy-track--short">
            <span className="landing-beyond__energy-fill landing-beyond__energy-fill--static landing-beyond__energy-fill--late" />
          </span>
          <span className="landing-beyond__energy-node landing-beyond__energy-node--end">{beyond.timelineEnd}</span>
        </div>

        <dl className="landing-beyond__stats">
          {beyond.stats.map((stat) => (
            <div key={stat.label} className="landing-beyond__stat-wrap">
              <div className="landing-beyond__stat landing-hover-pop">
                <dt className="landing-beyond__stat-value font-display">{stat.value}</dt>
                <dd className="landing-beyond__stat-label">{stat.label}</dd>
              </div>
            </div>
          ))}
        </dl>

        <div className="landing-beyond__program-shell hall-glass">
          <div className="landing-beyond__program-head">
            <p className="landing-beyond__program-label">{beyond.programLabel}</p>
            <span className="landing-beyond__program-live">
              <span className="landing-beyond__program-live-dot" aria-hidden />
              {beyond.programLive}
            </span>
          </div>

          <div className="landing-beyond__program">
            {HALL_BEYOND_GROUPS.map((group, groupIndex) => (
              <div
                key={group.id}
                className={`landing-beyond__column landing-beyond__column--${group.id} landing-beyond__column--enter`}
                style={{ animationDelay: `${groupIndex * 50}ms` }}
              >
                <article className="landing-beyond__column-card landing-hover-lift">
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
                          className={`landing-beyond__item landing-hover-row${isWildcard ? ' landing-beyond__item--wildcard' : ''}`}
                        >
                          <span className="landing-beyond__item-label font-display">{item.label}</span>
                          <span className="landing-beyond__item-detail">{item.detail}</span>
                        </li>
                      );
                    })}
                  </ul>
                </article>
              </div>
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
