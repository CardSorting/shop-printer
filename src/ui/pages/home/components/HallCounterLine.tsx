'use client';

import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { LANDING_COPY } from '../copy';
import { HALL_COUNTERS } from '../constants';
import { useHallDaypart } from '../hooks/useHallDaypart';
import { HallDaypartTimeline } from './HallDaypartTimeline';

const { counterLine } = LANDING_COPY;

function CounterCard({
  counter,
  hot,
}: {
  counter: (typeof HALL_COUNTERS)[number];
  hot: boolean;
}) {
  return (
    <Link href={counter.href} className="landing-counter-line__card group">
      <span className="landing-counter-line__index">{counter.id}</span>
      <div className="landing-counter-line__body">
        <div className="landing-counter-line__meta">
          <span className="landing-counter-line__cuisine">{counter.cuisine}</span>
          {hot && <span className="landing-counter-line__hot">Firing now</span>}
        </div>
        <span className="landing-counter-line__name font-display">{counter.name}</span>
        <span className="landing-counter-line__signature">{counter.signature}</span>
      </div>
      <ArrowUpRight
        className="landing-counter-line__arrow h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
        aria-hidden
      />
    </Link>
  );
}

export function HallCounterLine() {
  const { daypart } = useHallDaypart();
  const hotNames = new Set(LANDING_COPY.nowBoard[daypart].hotCounters);
  const track = [...HALL_COUNTERS, ...HALL_COUNTERS];

  return (
    <section id="landing-counter-line" className="landing-counter-line" aria-labelledby="counter-line-heading">
      <div className="landing-counter-line__header">
        <div>
          <p className="landing-counter-line__label">{counterLine.label}</p>
          <h2 id="counter-line-heading" className="landing-counter-line__headline font-display">
            {counterLine.headline}
          </h2>
          <p className="landing-counter-line__hint">{counterLine.hint}</p>
        </div>
        <HallDaypartTimeline />
      </div>

      <div className="landing-counter-line__scroll" aria-label="Scroll the counter line">
        <div className="landing-counter-line__track">
          {track.map((counter, i) => (
            <CounterCard key={`${counter.id}-${i}`} counter={counter} hot={hotNames.has(counter.name)} />
          ))}
        </div>
      </div>

      <p className="landing-counter-line__footer">{counterLine.footer}</p>
    </section>
  );
}
