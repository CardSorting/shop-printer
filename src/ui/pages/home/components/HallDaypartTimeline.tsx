'use client';

import { LANDING_COPY } from '../copy';
import { useHallDaypart } from '../hooks/useHallDaypart';
import type { HallDaypart } from '../utils/hallTime';

const ORDER: HallDaypart[] = ['morning', 'midday', 'afternoon', 'evening', 'late'];
const { daypartTimeline } = LANDING_COPY;

export function HallDaypartTimeline() {
  const { daypart, isOpen } = useHallDaypart();

  return (
    <div className="landing-daypart-timeline" role="list" aria-label="Hall rhythm through the day">
      {ORDER.map((part) => {
        const active = part === daypart;
        const item = daypartTimeline[part];
        return (
          <div
            key={part}
            role="listitem"
            className={`landing-daypart-timeline__item ${active ? 'landing-daypart-timeline__item--active' : ''}`}
            aria-current={active ? 'true' : undefined}
          >
            <span className="landing-daypart-timeline__time">{item.time}</span>
            <span className="landing-daypart-timeline__label">{item.label}</span>
            {active && isOpen !== false && (
              <span className="landing-daypart-timeline__live">Now</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
