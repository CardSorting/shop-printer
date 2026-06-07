'use client';

import { motion } from 'framer-motion';
import { STAGGER_CONTAINER_VARIANTS } from '@ui/animations';
import { LANDING_COPY } from '../copy';
import { HALL_AMENITIES } from '../constants';
import { HoverRow } from './MicroMotion';

const { amenities } = LANDING_COPY;

const ITEM_VARIANTS = {
  initial: { opacity: 0, y: 12 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] as const },
  },
};

export function HallAmenitiesStrip() {
  return (
    <section className="landing-amenities" aria-labelledby="hall-amenities-heading">
      <div className="landing-amenities__header">
        <p className="landing-amenities__label">{amenities.label}</p>
        <h2 id="hall-amenities-heading" className="landing-amenities__headline font-display">
          {amenities.headline}
        </h2>
      </div>

      <motion.ul
        className="landing-amenities__grid"
        initial="initial"
        whileInView="animate"
        viewport={{ once: true, margin: '-40px' }}
        variants={STAGGER_CONTAINER_VARIANTS}
      >
        {HALL_AMENITIES.map((item) => (
          <HoverRow key={item.id} className="landing-amenities__item" variants={ITEM_VARIANTS} shift={4}>
            <span className="landing-amenities__item-label">{item.label}</span>
            <span className="landing-amenities__item-detail">{item.detail}</span>
          </HoverRow>
        ))}
      </motion.ul>
    </section>
  );
}
