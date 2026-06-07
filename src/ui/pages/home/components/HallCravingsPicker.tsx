import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { LANDING_COPY } from '../copy';
import { HALL_CRAVINGS } from '../constants';

const { cravings } = LANDING_COPY;

export function HallCravingsPicker() {
  return (
    <section id="landing-cravings" className="landing-cravings" aria-labelledby="cravings-heading">
      <div className="landing-cravings__header">
        <p className="landing-cravings__label">{cravings.label}</p>
        <h2 id="cravings-heading" className="landing-cravings__headline font-display">
          {cravings.headline}
        </h2>
        <p className="landing-cravings__sub">{cravings.sub}</p>
      </div>

      <ul className="landing-cravings__grid">
        {HALL_CRAVINGS.map((item) => (
          <li key={item.id}>
            <Link href={item.href} className="landing-cravings__card group">
              <div>
                <span className="landing-cravings__card-label">{item.label}</span>
                <span className="landing-cravings__card-sub">{item.sub}</span>
              </div>
              <ArrowUpRight
                className="h-4 w-4 shrink-0 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                aria-hidden
              />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
