'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';
import { STAGGER_CONTAINER_VARIANTS } from '@ui/animations';
import { LANDING_COPY } from '../copy';
import { HALL_CRAVINGS } from '../constants';
import { CardGridItem } from './MicroMotion';

const { cravings } = LANDING_COPY;

const ITEM_VARIANTS = {
  initial: { opacity: 0, y: 16 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as const },
  },
};

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

      <motion.ul
        className="landing-cravings__grid"
        initial="initial"
        whileInView="animate"
        viewport={{ once: true, margin: '-40px' }}
        variants={STAGGER_CONTAINER_VARIANTS}
      >
        {HALL_CRAVINGS.map((item) => (
          <CardGridItem key={item.id} variants={ITEM_VARIANTS}>
            <Link href={item.href} className="landing-cravings__card group">
              <div>
                <span className="landing-cravings__card-label">{item.label}</span>
                <span className="landing-cravings__card-sub">{item.sub}</span>
              </div>
              <ArrowUpRight className="landing-cravings__card-arrow h-4 w-4 shrink-0" aria-hidden />
            </Link>
          </CardGridItem>
        ))}
      </motion.ul>
    </section>
  );
}
