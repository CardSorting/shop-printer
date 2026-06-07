'use client';

import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { LANDING_COPY } from '../copy';
import { HALL_COUNTERS } from '../constants';
import { useHallDaypart } from '../hooks/useHallDaypart';

const { vendors } = LANDING_COPY;

export function CounterDirectory() {
  const { daypart } = useHallDaypart();
  const hotNames = new Set(LANDING_COPY.nowBoard[daypart].hotCounters);

  return (
    <div className="landing-counter-dir">
      <div className="landing-counter-dir__header">
        <div>
          <p className="landing-counter-dir__label">{vendors.directoryLabel}</p>
          <p className="landing-counter-dir__hint">{vendors.directoryHint}</p>
        </div>
        <span className="landing-counter-dir__count font-display">{HALL_COUNTERS.length} counters</span>
      </div>

      <ul className="landing-counter-dir__grid">
        {HALL_COUNTERS.map((counter) => {
          const isHot = hotNames.has(counter.name);
          return (
            <li key={counter.id}>
              <Link href={counter.href} className="landing-counter-dir__card group">
                <span className="landing-counter-dir__index">{counter.id}</span>
                <div className="landing-counter-dir__body">
                  <div className="landing-counter-dir__meta">
                    <span className="landing-counter-dir__cuisine">{counter.cuisine}</span>
                    {isHot && <span className="landing-counter-dir__hot">Busy now</span>}
                  </div>
                  <h3 className="landing-counter-dir__name font-display">{counter.name}</h3>
                  <p className="landing-counter-dir__signature">{counter.signature}</p>
                </div>
                <ArrowUpRight
                  className="landing-counter-dir__arrow h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                  aria-hidden
                />
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
