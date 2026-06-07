import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { LANDING_COPY } from '../copy';
import { HALL_GATHERINGS } from '../constants';
import { HallCta } from './HallCta';

const { gatherings } = LANDING_COPY;

export function HallGatherings() {
  return (
    <aside className="landing-gatherings hall-glass" aria-labelledby="gatherings-heading">
      <div className="landing-gatherings__glow" aria-hidden />

      <div className="landing-gatherings__panel">
        <header className="landing-gatherings__header">
          <div className="landing-gatherings__intro">
            <div className="landing-gatherings__header-top">
              <p className="landing-gatherings__label">{gatherings.label}</p>
              <span className="hall-badge">{gatherings.stamp}</span>
            </div>
            <h3 id="gatherings-heading" className="landing-gatherings__headline font-display">
              {gatherings.headline}
            </h3>
            <div className="hall-rule landing-gatherings__rule" aria-hidden />
            <p className="landing-gatherings__sub">{gatherings.sub}</p>
            <p className="landing-gatherings__aside">{gatherings.aside}</p>
          </div>

          <HallCta
            href={gatherings.cta.href}
            label={gatherings.cta.label}
            variant="primary"
            dark
            className="landing-gatherings__cta landing-gatherings__cta--header"
            icon={<ArrowRight className="h-4 w-4" aria-hidden />}
          />
        </header>

        <div className="landing-gatherings__flow" aria-hidden>
          <span>{gatherings.flowStart}</span>
          <span className="landing-gatherings__flow-track">
            <span className="landing-gatherings__flow-fill landing-gatherings__flow-fill--static" />
          </span>
          <span>{gatherings.flowEnd}</span>
        </div>

        <ol className="landing-gatherings__grid landing-gatherings__grid--enter">
          {HALL_GATHERINGS.map((item, index) => {
            const isBuyout = item.id === 'buyout';

            return (
              <li
                key={item.id}
                className={`landing-gatherings__item${isBuyout ? ' landing-gatherings__item--featured' : ''}`}
                style={{ animationDelay: `${index * 30}ms` }}
              >
                <article className="landing-gatherings__card landing-hover-lift">
                  <header className="landing-gatherings__card-head">
                    <span className="landing-gatherings__step">{item.step}</span>
                    <span className="landing-gatherings__scale">{item.scale}</span>
                  </header>
                  <h4 className="landing-gatherings__card-title font-display">{item.label}</h4>
                  <ul className="landing-gatherings__chips">
                    {item.highlights.map((highlight) => (
                      <li key={highlight}>{highlight}</li>
                    ))}
                  </ul>
                </article>
              </li>
            );
          })}
        </ol>

        <footer className="landing-gatherings__foot">
          <p className="landing-gatherings__foot-note">{gatherings.footNote}</p>
          <HallCta
            href={gatherings.cta.href}
            label={gatherings.cta.label}
            variant="ghost"
            className="landing-gatherings__cta landing-gatherings__cta--footer"
            icon={<ArrowRight className="h-4 w-4" aria-hidden />}
          />
        </footer>
      </div>
    </aside>
  );
}
