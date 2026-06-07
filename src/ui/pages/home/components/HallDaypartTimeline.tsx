'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { LANDING_COPY } from '../copy';
import { useHallDaypart } from '../hooks/useHallDaypart';
import type { HallDaypart } from '../utils/hallTime';
import { MICRO_SPRING, MICRO_SPRING_SNAPPY } from './MicroMotion';

const ORDER: HallDaypart[] = ['morning', 'midday', 'afternoon', 'evening', 'late'];
const { daypartTimeline } = LANDING_COPY;

export function HallDaypartTimeline() {
  const { daypart, isOpen } = useHallDaypart();
  const reduceMotion = useReducedMotion();

  return (
    <div className="landing-daypart-timeline" role="list" aria-label="Hall rhythm through the day">
      {ORDER.map((part) => {
        const active = part === daypart;
        const item = daypartTimeline[part];

        return (
          <motion.div
            key={part}
            role="listitem"
            className={`landing-daypart-timeline__item${active ? ' landing-daypart-timeline__item--active' : ''}`}
            aria-current={active ? 'true' : undefined}
            layout={!reduceMotion}
            transition={reduceMotion ? { duration: 0 } : MICRO_SPRING}
            {...(reduceMotion || active
              ? {}
              : {
                  whileHover: { y: -2, transition: MICRO_SPRING_SNAPPY },
                  whileTap: { scale: 0.98, transition: { duration: 0.1 } },
                })}
          >
            <span className="landing-daypart-timeline__time">{item.time}</span>
            <span className="landing-daypart-timeline__label">{item.label}</span>
            {active && isOpen !== false && (
              <motion.span
                className="landing-daypart-timeline__live"
                initial={reduceMotion ? false : { scale: 0.75, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={reduceMotion ? { duration: 0 } : MICRO_SPRING_SNAPPY}
              >
                Now
              </motion.span>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}
