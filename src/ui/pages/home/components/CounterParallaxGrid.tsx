'use client';

import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { LANDING_COPY } from '../copy';
import { HALL_COUNTERS } from '../constants';
import type { HallDaypart } from '../utils/hallTime';
import type { SimulatedHallPulse } from '../hooks/useSimulatedHallPulse';
import type { StallCrowdSignal } from '../utils/stallCrowd';
import { CounterHoverMedia } from './CounterHoverMedia';
import { StallCrowdChip } from './StallCrowdChip';

const { vendors } = LANDING_COPY;

type Counter = (typeof HALL_COUNTERS)[number];

type CounterParallaxGridProps = {
  pulse?: SimulatedHallPulse;
  isOpen?: boolean | null;
  daypart: HallDaypart;
};

function CounterGridTile({
  counter,
  index,
  isHot,
  stallSignal,
  showStallCrowd,
}: {
  counter: Counter;
  index: number;
  isHot: boolean;
  stallSignal?: StallCrowdSignal;
  showStallCrowd?: boolean;
}) {
  const isHero = counter.layout === 'hero';
  const showChip = Boolean(showStallCrowd && stallSignal && stallSignal.level !== 'quiet');

  return (
    <li
      className={`landing-counter-grid__cell landing-counter-grid__cell--enter landing-counter-grid__cell--${counter.layout}${isHot ? ' landing-counter-grid__cell--hot' : ''}${isHero ? ' landing-counter-grid__cell--spotlight' : ''}`}
      style={{ animationDelay: `${Math.floor(index / 3) * 30 + (index % 3) * 18}ms` }}
    >
      <Link href={counter.href} className="landing-counter-grid__link group">
        <div className="landing-counter-grid__media">
          <div className="landing-counter-grid__media-inner">
            <CounterHoverMedia
              img={counter.img}
              alt={counter.alt}
              sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
              priority={isHero}
            />
          </div>
          <div className="landing-counter-grid__scrim" aria-hidden />
          <span className="landing-counter-grid__index font-display" aria-hidden>
            {counter.id}
          </span>
          <div className="landing-counter-grid__copy">
            <div className="landing-counter-grid__meta">
              <span className="landing-counter-grid__cuisine">{counter.cuisine}</span>
              {showChip && <StallCrowdChip signal={stallSignal!} size={isHero ? 'md' : 'sm'} />}
              {isHot && !showChip && <span className="landing-counter-grid__hot">Busy now</span>}
            </div>
            <div className="landing-counter-grid__foot">
              <div>
                <h3 className="landing-counter-grid__name font-display">{counter.name}</h3>
                <p className="landing-counter-grid__signature">{counter.signature}</p>
              </div>
              <span className="landing-counter-grid__arrow" aria-hidden>
                <ArrowUpRight className="h-4 w-4" />
              </span>
            </div>
          </div>
        </div>
      </Link>
    </li>
  );
}

export function CounterParallaxGrid({ pulse, isOpen, daypart }: CounterParallaxGridProps) {
  const showStallCrowd = isOpen === true && !!pulse?.stallCrowd;
  const hotNames = new Set(LANDING_COPY.nowBoard[daypart].hotCounters);

  return (
    <div className="landing-counter-grid-wrap landing-counter-grid-wrap--enter">
      <div className="landing-counter-grid__rail">
        <div>
          <p className="landing-counter-grid__label">{vendors.directoryLabel}</p>
          <p className="landing-counter-grid__hint">{vendors.directoryHint}</p>
        </div>
        <span className="landing-counter-grid__count font-display">{HALL_COUNTERS.length} kitchens</span>
        <span className="landing-counter-grid__rail-line landing-counter-grid__rail-line--static" aria-hidden />
      </div>

      <ul className="landing-counter-grid">
        {HALL_COUNTERS.map((counter, index) => (
          <CounterGridTile
            key={counter.id}
            counter={counter}
            index={index}
            isHot={hotNames.has(counter.name)}
            stallSignal={pulse?.stallCrowd[counter.name]}
            showStallCrowd={showStallCrowd}
          />
        ))}
      </ul>
    </div>
  );
}
