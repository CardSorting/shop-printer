import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { LANDING_COPY } from '../copy';
import { HALL_COMBOS } from '../constants';

const { combos } = LANDING_COPY;

export function HallCombosSection() {
  return (
    <section id="landing-combos" className="landing-combos" aria-labelledby="combos-heading">
      <div className="landing-combos__header">
        <p className="landing-combos__label">{combos.label}</p>
        <h2 id="combos-heading" className="landing-combos__headline font-display">
          {combos.headline}
        </h2>
        <p className="landing-combos__sub">{combos.sub}</p>
      </div>

      <ul className="landing-combos__grid">
        {HALL_COMBOS.map((combo) => (
          <li key={combo.id}>
            <Link href={combo.href} className="landing-combos__card group">
              <div>
                <p className="landing-combos__card-sub">{combo.subtitle}</p>
                <h3 className="landing-combos__card-title font-display">{combo.title}</h3>
                <ol className="landing-combos__stops">
                  {combo.stops.map((stop, i) => (
                    <li key={stop}>
                      <span className="landing-combos__stop-index">{i + 1}</span>
                      {stop}
                    </li>
                  ))}
                </ol>
              </div>
              <ArrowRight
                className="landing-combos__arrow h-4 w-4 transition-transform group-hover:translate-x-0.5"
                aria-hidden
              />
            </Link>
          </li>
        ))}
      </ul>

      <Link href="/products" className="landing-combos__cta">
        {combos.cta}
        <ArrowRight className="h-4 w-4" aria-hidden />
      </Link>
    </section>
  );
}
