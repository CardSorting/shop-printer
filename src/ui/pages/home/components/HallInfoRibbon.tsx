'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { LANDING_COPY, LANDING_META } from '../copy';
import { MICRO_SPRING_SNAPPY } from './MicroMotion';

const { ribbon } = LANDING_COPY.hero;

const RIBBON_ITEMS = [
  { key: 'hours', label: 'Hours', value: (hours: string) => hours },
  { key: 'counters', label: 'Counters', value: () => `${LANDING_META.vendorCount} independent kitchens` },
  { key: 'neighborhood', label: 'Neighborhood', value: () => ribbon.neighborhood },
  { key: 'vibe', label: 'Right now', value: (_hours: string, vibe?: string) => vibe ?? LANDING_META.tagline },
] as const;

const ITEM_VARIANTS = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] as const },
  },
};

const RIBBON_HOVER = { y: -2, transition: MICRO_SPRING_SNAPPY };
const RIBBON_TAP = { scale: 0.98, transition: { duration: 0.1 } };

type HallInfoRibbonProps = {
  hoursLabel: string;
  vibe?: string;
};

/** Hero ribbon — staggered reveal synced with card motion */
export function HallInfoRibbon({ hoursLabel, vibe }: HallInfoRibbonProps) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.dl
      className="landing-hall-ribbon"
      aria-label="WoodBine at a glance"
      initial={reduceMotion ? false : 'hidden'}
      animate={reduceMotion ? undefined : 'visible'}
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: 0.06, delayChildren: 0.04 } },
      }}
    >
      {RIBBON_ITEMS.map(({ key, label, value }) => (
        <motion.div
          key={key}
          className="landing-hall-ribbon__item"
          variants={reduceMotion ? undefined : ITEM_VARIANTS}
          {...(reduceMotion ? {} : { whileHover: RIBBON_HOVER, whileTap: RIBBON_TAP })}
        >
          <dt>{label}</dt>
          <dd>{value(hoursLabel, vibe)}</dd>
        </motion.div>
      ))}
    </motion.dl>
  );
}
