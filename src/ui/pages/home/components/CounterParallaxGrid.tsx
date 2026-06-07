'use client';

import Image from 'next/image';
import Link from 'next/link';
import { motion, useTransform, type MotionValue } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';
import { STAGGER_CONTAINER_VARIANTS } from '@ui/animations';
import { LANDING_COPY } from '../copy';
import { HALL_COUNTERS } from '../constants';
import { useHallDaypart } from '../hooks/useHallDaypart';
import { useStaggeredParallaxX, useStaggeredParallaxY } from '../hooks/useParallax';
import { ParallaxMotion } from './ParallaxMotion';

const { vendors } = LANDING_COPY;

type Counter = (typeof HALL_COUNTERS)[number];

const TILE_VARIANTS = {
  initial: { opacity: 0, y: 24, scale: 0.98 },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.62, ease: [0.16, 1, 0.3, 1] as const },
  },
};

type CounterParallaxGridProps = {
  progress?: MotionValue<number>;
};

function CounterGridTile({
  counter,
  progress,
  index,
  isHot,
}: {
  counter: Counter;
  progress: MotionValue<number>;
  index: number;
  isHot: boolean;
}) {
  const y = useStaggeredParallaxY(progress, index, 4, [5, -7]);
  const x = useStaggeredParallaxX(progress, index, [-2.5, 2.5]);
  const depth = 0.65 + (index % 4) * 0.28;
  const imageY = useTransform(progress, [0, 1], [`${6 * depth}%`, `${-10 * depth}%`]);
  const imageScale = useTransform(progress, [0, 0.45, 1], [1.14, 1.02, 1.1]);

  return (
    <motion.li
      className={`landing-counter-grid__cell landing-counter-grid__cell--${counter.layout}${isHot ? ' landing-counter-grid__cell--hot' : ''}`}
      variants={TILE_VARIANTS}
      transition={{ delay: index * 0.04 }}
    >
      <ParallaxMotion modes={['transform']} x={x} y={y} className="landing-counter-grid__parallax">
        <Link href={counter.href} className="landing-counter-grid__link group">
          <div className="landing-counter-grid__media">
            <ParallaxMotion modes={['transform']} y={imageY} scale={imageScale} className="landing-counter-grid__media-inner">
              <Image
                src={counter.img}
                alt={counter.alt}
                fill
                sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                className="landing-counter-grid__image object-cover"
              />
            </ParallaxMotion>
            <div className="landing-counter-grid__scrim" aria-hidden />
            <span className="landing-counter-grid__index font-display" aria-hidden>
              {counter.id}
            </span>
            <div className="landing-counter-grid__copy">
              <div className="landing-counter-grid__meta">
                <span className="landing-counter-grid__cuisine">{counter.cuisine}</span>
                {isHot && <span className="landing-counter-grid__hot">Busy now</span>}
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
      </ParallaxMotion>
    </motion.li>
  );
}

function CounterGridTileStatic({ counter, index, isHot }: { counter: Counter; index: number; isHot: boolean }) {
  return (
    <motion.li
      className={`landing-counter-grid__cell landing-counter-grid__cell--${counter.layout}${isHot ? ' landing-counter-grid__cell--hot' : ''}`}
      variants={TILE_VARIANTS}
      transition={{ delay: index * 0.04 }}
    >
      <Link href={counter.href} className="landing-counter-grid__link group">
        <div className="landing-counter-grid__media">
          <div className="landing-counter-grid__media-inner">
            <Image
              src={counter.img}
              alt={counter.alt}
              fill
              sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className="landing-counter-grid__image object-cover"
            />
          </div>
          <div className="landing-counter-grid__scrim" aria-hidden />
          <span className="landing-counter-grid__index font-display" aria-hidden>
            {counter.id}
          </span>
          <div className="landing-counter-grid__copy">
            <div className="landing-counter-grid__meta">
              <span className="landing-counter-grid__cuisine">{counter.cuisine}</span>
              {isHot && <span className="landing-counter-grid__hot">Busy now</span>}
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
    </motion.li>
  );
}

export function CounterParallaxGrid({ progress }: CounterParallaxGridProps) {
  const { daypart } = useHallDaypart();
  const hotNames = new Set(LANDING_COPY.nowBoard[daypart].hotCounters);

  return (
    <div className="landing-counter-grid-wrap">
      <div className="landing-counter-grid__rail">
        <div>
          <p className="landing-counter-grid__label">{vendors.directoryLabel}</p>
          <p className="landing-counter-grid__hint">{vendors.directoryHint}</p>
        </div>
        <span className="landing-counter-grid__count font-display">{HALL_COUNTERS.length} kitchens</span>
      </div>

      <motion.ul
        className="landing-counter-grid"
        initial="initial"
        whileInView="animate"
        viewport={{ once: true, margin: '-40px' }}
        variants={STAGGER_CONTAINER_VARIANTS}
      >
        {HALL_COUNTERS.map((counter, index) => {
          const isHot = hotNames.has(counter.name);

          return progress ? (
            <CounterGridTile key={counter.id} counter={counter} progress={progress} index={index} isHot={isHot} />
          ) : (
            <CounterGridTileStatic key={counter.id} counter={counter} index={index} isHot={isHot} />
          );
        })}
      </motion.ul>
    </div>
  );
}
