'use client';

import Link from 'next/link';
import { Flame } from 'lucide-react';
import { LANDING_COPY } from '../copy';
import { getCounterHref } from '../constants';
import { useHallDaypart } from '../hooks/useHallDaypart';

const { nowBoard } = LANDING_COPY;

export function HallNowBoard() {
  const { daypart, isOpen } = useHallDaypart();
  const board = nowBoard[daypart];

  return (
    <section className="landing-now-board" aria-labelledby="now-board-heading">
      <div className="landing-now-board__inner">
        <div className="landing-now-board__status">
          <Flame className="landing-now-board__icon h-4 w-4" aria-hidden />
          <div>
            <p className="landing-now-board__eyebrow">{isOpen ? nowBoard.openLabel : nowBoard.closedLabel}</p>
            <h2 id="now-board-heading" className="landing-now-board__title font-display">
              {board.title}
            </h2>
          </div>
        </div>

        <p className="landing-now-board__energy">
          <span className="landing-now-board__energy-label">Floor energy</span>
          <span className="landing-now-board__energy-value">{board.energy}</span>
        </p>

        <ul className="landing-now-board__counters" aria-label="Counters busy right now">
          {board.hotCounters.map((name) => (
            <li key={name}>
              <Link href={getCounterHref(name)} className="landing-now-board__counter-link">
                {name}
              </Link>
            </li>
          ))}
        </ul>

        <Link href={board.cta.href} className="landing-now-board__cta">
          {board.cta.label}
        </Link>
      </div>
    </section>
  );
}
