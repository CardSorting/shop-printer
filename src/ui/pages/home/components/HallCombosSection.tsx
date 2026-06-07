'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { STAGGER_CONTAINER_VARIANTS } from '@ui/animations';
import { LANDING_COPY } from '../copy';
import { HALL_COMBOS } from '../constants';
import { CardGridItem, HoverLink } from './MicroMotion';

const { combos } = LANDING_COPY;

const ITEM_VARIANTS = {
  initial: { opacity: 0, y: 20 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: [0.16, 1, 0.3, 1] as const },
  },
};

export function HallCombosSection() {
  return (
    <section id="landing-combos" className="landing-combos" aria-labelledby="combos-heading">
      <div className="landing-combos__header">
        <p className="landing-combos__label">{combos.label}</p>
        <h2 id="combos-heading" className="landing-combos__headline font-display">
          {combos.headline}
        </h2>
        <p className="landing-combos__sub">{combos.sub}</p>
      </div>

      <motion.ul
        className="landing-combos__grid"
        initial="initial"
        whileInView="animate"
        viewport={{ once: true, margin: '-40px' }}
        variants={STAGGER_CONTAINER_VARIANTS}
      >
        {HALL_COMBOS.map((combo) => (
          <CardGridItem key={combo.id} variants={ITEM_VARIANTS}>
            <Link href={combo.href} className="landing-combos__card group">
              <div>
                <p className="landing-combos__card-sub">{combo.subtitle}</p>
                <h3 className="landing-combos__card-title font-display">{combo.title}</h3>
                <ol className="landing-combos__stops">
                  {combo.stops.map((stop, i) => (
                    <li key={stop}>
                      <span className="landing-combos__stop-index">{i + 1}</span>
                      {stop}
                    </li>
                  ))}
                </ol>
              </div>
              <ArrowRight className="landing-combos__arrow h-4 w-4" aria-hidden />
            </Link>
          </CardGridItem>
        ))}
      </motion.ul>

      <HoverLink className="landing-combos__cta-wrap">
        <Link href="/products" className="landing-combos__cta">
          {combos.cta}
          <ArrowRight className="landing-combos__cta-arrow h-4 w-4" aria-hidden />
        </Link>
      </HoverLink>
    </section>
  );
}
