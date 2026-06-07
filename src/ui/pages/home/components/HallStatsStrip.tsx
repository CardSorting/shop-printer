'use client';

import { motion } from '../motion';
import { STAGGER_CONTAINER_VARIANTS } from '@ui/animations';
import { LANDING_COPY } from '../copy';
import { HALL_STATS } from '../constants';
import { StatPop } from './MicroMotion';

const { stats } = LANDING_COPY;

const ITEM_VARIANTS = {
  initial: { opacity: 0, y: 14 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as const },
  },
};

export function HallStatsStrip() {
  return (
    <section className="landing-hall-stats" aria-label={stats.label}>
      <motion.ul
        className="landing-hall-stats__grid"
        initial="initial"
        whileInView="animate"
        viewport={{ once: true, margin: '-40px' }}
        variants={STAGGER_CONTAINER_VARIANTS}
      >
        {HALL_STATS.map((item) => (
          <motion.li key={item.label} className="landing-hall-stats__item" variants={ITEM_VARIANTS}>
            <StatPop className="landing-hall-stats__stat">
              <span className="landing-hall-stats__value font-display">{item.value}</span>
              <span className="landing-hall-stats__label">{item.label}</span>
              <span className="landing-hall-stats__detail">{item.detail}</span>
            </StatPop>
          </motion.li>
        ))}
      </motion.ul>
    </section>
  );
}
