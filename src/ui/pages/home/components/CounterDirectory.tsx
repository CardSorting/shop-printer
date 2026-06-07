'use client';

import Link from 'next/link';
import { motion, type MotionValue } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';
import type { ReactNode } from 'react';
import { STAGGER_CONTAINER_VARIANTS } from '@ui/animations';
import { LANDING_COPY } from '../copy';
import { HALL_COUNTERS } from '../constants';
import { useHallDaypart } from '../hooks/useHallDaypart';
import { useStaggeredParallaxX, useStaggeredParallaxY } from '../hooks/useParallax';
import { ParallaxMotion } from './ParallaxMotion';

const { vendors } = LANDING_COPY;

const CARD_VARIANTS = {
  initial: { opacity: 0, y: 20 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.48, ease: [0.16, 1, 0.3, 1] as const },
  },
};

type CounterDirectoryProps = {
  progress?: MotionValue<number>;
};

function CounterParallaxCell({
  progress,
  index,
  children,
}: {
  progress: MotionValue<number>;
  index: number;
  children: ReactNode;
}) {
  const y = useStaggeredParallaxY(progress, index);
  const x = useStaggeredParallaxX(progress, index, [-1.75, 1.75]);

  return (
    <ParallaxMotion modes={['transform']} x={x} y={y}>
      {children}
    </ParallaxMotion>
  );
}

export function CounterDirectory({ progress }: CounterDirectoryProps) {
  const { daypart } = useHallDaypart();
  const hotNames = new Set(LANDING_COPY.nowBoard[daypart].hotCounters);

  return (
    <div className="landing-counter-dir">
      <div className="landing-counter-dir__header">
        <div>
          <p className="landing-counter-dir__label">{vendors.directoryLabel}</p>
          <p className="landing-counter-dir__hint">{vendors.directoryHint}</p>
        </div>
        <span className="landing-counter-dir__count font-display">{HALL_COUNTERS.length} counters</span>
      </div>

      <motion.ul
        className="landing-counter-dir__grid"
        initial="initial"
        whileInView="animate"
        viewport={{ once: true, margin: '-40px' }}
        variants={STAGGER_CONTAINER_VARIANTS}
      >
        {HALL_COUNTERS.map((counter, index) => {
          const isHot = hotNames.has(counter.name);
          const card = (
            <Link href={counter.href} className="landing-counter-dir__card group">
              <span className="landing-counter-dir__index">{counter.id}</span>
              <div className="landing-counter-dir__body">
                <div className="landing-counter-dir__meta">
                  <span className="landing-counter-dir__cuisine">{counter.cuisine}</span>
                  {isHot && <span className="landing-counter-dir__hot">Busy now</span>}
                </div>
                <h3 className="landing-counter-dir__name font-display">{counter.name}</h3>
                <p className="landing-counter-dir__signature">{counter.signature}</p>
              </div>
              <ArrowUpRight
                className="landing-counter-dir__arrow h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                aria-hidden
              />
            </Link>
          );

          return (
            <motion.li key={counter.id} variants={CARD_VARIANTS} transition={{ delay: index * 0.03 }}>
              {progress ? (
                <CounterParallaxCell progress={progress} index={index}>
                  {card}
                </CounterParallaxCell>
              ) : (
                card
              )}
            </motion.li>
          );
        })}
      </motion.ul>
    </div>
  );
}
