'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion, useTransform, type MotionValue, type Variants } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';
import { LANDING_COPY } from '../copy';
import { HALL_COUNTERS } from '../constants';
import { useHallDaypart } from '../hooks/useHallDaypart';
import { warmAllCounterVideos } from '../hooks/useCounterVideoWarmCache';
import { useStaggeredParallaxX, useStaggeredParallaxY, useStaggeredParallaxRotateY } from '../hooks/useParallax';
import type { SimulatedHallPulse } from '../hooks/useSimulatedHallPulse';
import type { StallCrowdSignal } from '../utils/stallCrowd';
import { getCounterVideoSrc } from '../utils/counterMedia';
import { CARD_LIFT_SUBTLE, CARD_TAP } from './MicroMotion';
import { CounterHoverMedia } from './CounterHoverMedia';
import { StallCrowdChip } from './HallLiveTickers';
import { ParallaxMotion } from './ParallaxMotion';
import { PointerTiltSurface } from './PointerMotionSurfaces';

const { vendors } = LANDING_COPY;

type Counter = (typeof HALL_COUNTERS)[number];

const GRID_STAGGER: Variants = {
  initial: {},
  animate: {
    transition: { staggerChildren: 0.055, delayChildren: 0.18 },
  },
};

const COPY_STAGGER: Variants = {
  initial: {},
  animate: {
    transition: { staggerChildren: 0.055, delayChildren: 0.22 },
  },
};

const COPY_LINE: Variants = {
  initial: { opacity: 0, y: 14, filter: 'blur(5px)' },
  animate: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { duration: 0.58, ease: [0.16, 1, 0.3, 1] },
  },
};

function tileWaveDelay(index: number) {
  const wave = Math.floor(index / 3);
  return 0.02 + wave * 0.07 + (index % 3) * 0.038;
}

const tileVariants: Variants = {
  initial: (index: number) => ({
    opacity: 0,
    y: 52 + (index % 3) * 10,
    x: (index % 2 === 0 ? -1 : 1) * (22 + (index % 4) * 6),
    scale: index === 0 ? 0.9 : 0.92,
    rotateX: 12 + (index % 3) * 2,
    rotateY: (index % 2 === 0 ? -1 : 1) * (8 + (index % 3) * 2),
    filter: 'blur(12px)',
  }),
  animate: (index: number) => ({
    opacity: 1,
    y: 0,
    x: 0,
    scale: 1,
    rotateX: 0,
    rotateY: 0,
    filter: 'blur(0px)',
    transition: {
      duration: 0.92,
      delay: tileWaveDelay(index),
      ease: [0.16, 1, 0.3, 1],
    },
  }),
};

const RAIL_LABEL: Variants = {
  initial: { opacity: 0, x: -24, filter: 'blur(6px)' },
  animate: {
    opacity: 1,
    x: 0,
    filter: 'blur(0px)',
    transition: { duration: 0.64, ease: [0.16, 1, 0.3, 1] },
  },
};

const RAIL_HINT: Variants = {
  initial: { opacity: 0, clipPath: 'inset(0 100% 0 0 round 2px)' },
  animate: {
    opacity: 1,
    clipPath: 'inset(0 0 0 0 round 2px)',
    transition: { duration: 0.72, ease: [0.16, 1, 0.3, 1], delay: 0.08 },
  },
};

const RAIL_COUNT: Variants = {
  initial: { opacity: 0, y: 18, scale: 0.86 },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.12 },
  },
};

type CounterParallaxGridProps = {
  progress?: MotionValue<number>;
  pulse?: SimulatedHallPulse;
  isOpen?: boolean | null;
};

function CounterGridTile({
  counter,
  progress,
  index,
  isHot,
  reduceMotion,
  stallSignal,
  showStallCrowd,
  preloadVideo,
}: {
  counter: Counter;
  progress: MotionValue<number>;
  index: number;
  isHot: boolean;
  reduceMotion: boolean | null;
  stallSignal?: StallCrowdSignal;
  showStallCrowd?: boolean;
  preloadVideo?: boolean;
}) {
  const y = useStaggeredParallaxY(progress, index, 4, [8, -10]);
  const x = useStaggeredParallaxX(progress, index, [-4, 4]);
  const rotateY = useStaggeredParallaxRotateY(progress, index, 4, [-5, 5]);
  const depth = 0.65 + (index % 4) * 0.28;
  const imageY = useTransform(progress, [0, 1], [`${10 * depth}%`, `${-14 * depth}%`]);
  const imageScale = useTransform(progress, [0, 0.38, 0.72, 1], [1.2, 1.03, 1.06, 1.14]);
  const copyY = useTransform(progress, [0, 0.35, 0.72], ['1.35rem', '0rem', '-0.45rem']);
  const copyOpacity = useTransform(progress, [0.06, 0.26], [0.45, 1]);
  const mediaClip = useTransform(
    progress,
    [0.03 + index * 0.012, 0.2 + index * 0.018],
    ['inset(18% 10% 0 10% round 0.85rem)', 'inset(0% 0% 0% 0% round 0.85rem)'],
  );
  const scrimOpacity = useTransform(progress, [0.08 + index * 0.01, 0.26 + index * 0.012], [0.35, 1]);
  const indexY = useTransform(progress, [0.04, 0.22], ['-1.75rem', '0rem']);
  const indexOpacity = useTransform(progress, [0.05, 0.18], [0, 1]);
  const borderGlow = useTransform(progress, [0.1 + index * 0.008, 0.28 + index * 0.01], [0, 1]);
  const isHero = counter.layout === 'hero';
  const showChip = Boolean(showStallCrowd && stallSignal && stallSignal.level !== 'quiet');

  return (
    <motion.li
      className={`landing-counter-grid__cell landing-counter-grid__cell--${counter.layout}${isHot ? ' landing-counter-grid__cell--hot' : ''}${isHero ? ' landing-counter-grid__cell--spotlight' : ''}`}
      custom={index}
      variants={reduceMotion ? undefined : tileVariants}
      whileHover={reduceMotion ? undefined : CARD_LIFT_SUBTLE}
      whileTap={reduceMotion ? undefined : CARD_TAP}
      style={{ transformPerspective: 920 }}
    >
      <ParallaxMotion modes={['transform']} x={x} y={y} rotateY={rotateY} className="landing-counter-grid__parallax">
        <Link href={counter.href} className="landing-counter-grid__link group">
          <PointerTiltSurface className="landing-counter-grid__media" maxRotate={isHot ? 7 : isHero ? 6 : 5}>
            <ParallaxMotion
              modes={['fade']}
              opacity={borderGlow}
              className="landing-counter-grid__frame-glow"
              aria-hidden
            />
            <ParallaxMotion modes={['clip']} clipPath={mediaClip} className="landing-counter-grid__media-clip">
              <ParallaxMotion modes={['transform']} y={imageY} scale={imageScale} className="landing-counter-grid__media-inner">
                <CounterHoverMedia
                  img={counter.img}
                  alt={counter.alt}
                  sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                  priority={isHero}
                  eagerVideo={isHero}
                  preloadVideo={preloadVideo}
                />
              </ParallaxMotion>
            </ParallaxMotion>
            {!reduceMotion && (
              <motion.span
                className="landing-counter-grid__shine"
                aria-hidden
                initial={{ x: '-130%' }}
                whileInView={{ x: '130%' }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{
                  delay: tileWaveDelay(index) + 0.18,
                  duration: 0.95,
                  ease: [0.16, 1, 0.3, 1],
                }}
              />
            )}
            <ParallaxMotion modes={['fade']} opacity={scrimOpacity} className="landing-counter-grid__scrim" aria-hidden />
            <ParallaxMotion modes={['shift-y', 'fade']} y={indexY} opacity={indexOpacity}>
              <span className="landing-counter-grid__index font-display" aria-hidden>
                {counter.id}
              </span>
            </ParallaxMotion>
            <ParallaxMotion modes={['shift-y', 'fade']} y={copyY} opacity={copyOpacity} className="landing-counter-grid__copy">
              <motion.div variants={reduceMotion ? undefined : COPY_STAGGER} initial="initial" whileInView="animate" viewport={{ once: true, margin: '-30px' }}>
                <motion.div variants={reduceMotion ? undefined : COPY_LINE} className="landing-counter-grid__meta">
                  <span className="landing-counter-grid__cuisine">{counter.cuisine}</span>
                  {showChip && <StallCrowdChip signal={stallSignal!} size={isHero ? 'md' : 'sm'} />}
                  {isHot && !showChip && (
                    <motion.span
                      className="landing-counter-grid__hot"
                      animate={reduceMotion ? undefined : { scale: [1, 1.04, 1] }}
                      transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
                    >
                      Busy now
                    </motion.span>
                  )}
                </motion.div>
                <motion.div variants={reduceMotion ? undefined : COPY_LINE} className="landing-counter-grid__foot">
                  <div>
                    <h3 className="landing-counter-grid__name font-display">{counter.name}</h3>
                    <p className="landing-counter-grid__signature">{counter.signature}</p>
                  </div>
                  <span className="landing-counter-grid__arrow" aria-hidden>
                    <ArrowUpRight className="h-4 w-4" />
                  </span>
                </motion.div>
              </motion.div>
            </ParallaxMotion>
          </PointerTiltSurface>
        </Link>
      </ParallaxMotion>
    </motion.li>
  );
}

function CounterGridTileStatic({
  counter,
  index,
  isHot,
  reduceMotion,
  stallSignal,
  showStallCrowd,
  preloadVideo,
}: {
  counter: Counter;
  index: number;
  isHot: boolean;
  reduceMotion: boolean | null;
  stallSignal?: StallCrowdSignal;
  showStallCrowd?: boolean;
  preloadVideo?: boolean;
}) {
  const isHero = counter.layout === 'hero';
  const showChip = Boolean(showStallCrowd && stallSignal && stallSignal.level !== 'quiet');

  return (
    <motion.li
      className={`landing-counter-grid__cell landing-counter-grid__cell--${counter.layout}${isHot ? ' landing-counter-grid__cell--hot' : ''}${isHero ? ' landing-counter-grid__cell--spotlight' : ''}`}
      custom={index}
      variants={reduceMotion ? undefined : tileVariants}
      whileHover={reduceMotion ? undefined : CARD_LIFT_SUBTLE}
      whileTap={reduceMotion ? undefined : CARD_TAP}
    >
      <Link href={counter.href} className="landing-counter-grid__link group">
        <div className="landing-counter-grid__media">
          <div className="landing-counter-grid__media-inner">
            <CounterHoverMedia
              img={counter.img}
              alt={counter.alt}
              sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
              priority={isHero}
              eagerVideo={isHero}
              preloadVideo={preloadVideo}
            />
          </div>
          <div className="landing-counter-grid__scrim" aria-hidden />
          <span className="landing-counter-grid__index font-display" aria-hidden>
            {counter.id}
          </span>
          <motion.div variants={reduceMotion ? undefined : COPY_STAGGER} initial="initial" whileInView="animate" viewport={{ once: true, margin: '-30px' }} className="landing-counter-grid__copy">
            <motion.div variants={reduceMotion ? undefined : COPY_LINE} className="landing-counter-grid__meta">
              <span className="landing-counter-grid__cuisine">{counter.cuisine}</span>
              {showChip && <StallCrowdChip signal={stallSignal!} size={isHero ? 'md' : 'sm'} />}
              {isHot && !showChip && (
                <span className="landing-counter-grid__hot">Busy now</span>
              )}
            </motion.div>
            <motion.div variants={reduceMotion ? undefined : COPY_LINE} className="landing-counter-grid__foot">
              <div>
                <h3 className="landing-counter-grid__name font-display">{counter.name}</h3>
                <p className="landing-counter-grid__signature">{counter.signature}</p>
              </div>
              <span className="landing-counter-grid__arrow" aria-hidden>
                <ArrowUpRight className="h-4 w-4" />
              </span>
            </motion.div>
          </motion.div>
        </div>
      </Link>
    </motion.li>
  );
}

function CounterGridRail({ progress }: { progress: MotionValue<number> }) {
  const railY = useTransform(progress, [0, 0.32], ['10%', '-5%']);
  const labelX = useTransform(progress, [0.04, 0.2], ['-1.5rem', '0rem']);
  const labelOpacity = useTransform(progress, [0.04, 0.18], [0, 1]);
  const hintClip = useTransform(progress, [0.08, 0.24], ['inset(0 100% 0 0 round 2px)', 'inset(0 0 0 0 round 2px)']);
  const lineScale = useTransform(progress, [0.06, 0.26], [0, 1]);
  const countScale = useTransform(progress, [0.08, 0.28], [0.78, 1]);
  const countOpacity = useTransform(progress, [0.06, 0.22], [0.15, 1]);
  const countY = useTransform(progress, [0.06, 0.24], ['1.15rem', '0rem']);
  const countRotate = useTransform(progress, [0.06, 0.24], ['-2deg', '0deg']);

  return (
    <ParallaxMotion modes={['shift-y']} y={railY}>
      <div className="landing-counter-grid__rail">
        <ParallaxMotion modes={['shift-x', 'fade']} x={labelX} opacity={labelOpacity}>
          <div>
            <p className="landing-counter-grid__label">{vendors.directoryLabel}</p>
            <ParallaxMotion modes={['clip']} clipPath={hintClip}>
              <p className="landing-counter-grid__hint">{vendors.directoryHint}</p>
            </ParallaxMotion>
          </div>
        </ParallaxMotion>
        <ParallaxMotion modes={['transform', 'fade']} scale={countScale} opacity={countOpacity} y={countY} rotate={countRotate}>
          <span className="landing-counter-grid__count font-display">{HALL_COUNTERS.length} kitchens</span>
        </ParallaxMotion>
        <ParallaxMotion modes={['scale-x']} scaleX={lineScale} className="landing-counter-grid__rail-line" aria-hidden />
      </div>
    </ParallaxMotion>
  );
}

function CounterGridRailStatic({ reduceMotion }: { reduceMotion: boolean | null }) {
  return (
    <motion.div
      className="landing-counter-grid__rail"
      initial={reduceMotion ? false : 'initial'}
      whileInView={reduceMotion ? undefined : 'animate'}
      viewport={{ once: true, margin: '-50px' }}
      variants={reduceMotion ? undefined : { initial: {}, animate: { transition: { staggerChildren: 0.08 } } }}
    >
      <motion.div variants={reduceMotion ? undefined : RAIL_LABEL}>
        <p className="landing-counter-grid__label">{vendors.directoryLabel}</p>
        <motion.p className="landing-counter-grid__hint" variants={reduceMotion ? undefined : RAIL_HINT}>
          {vendors.directoryHint}
        </motion.p>
      </motion.div>
      <motion.span className="landing-counter-grid__count font-display" variants={reduceMotion ? undefined : RAIL_COUNT}>
        {HALL_COUNTERS.length} kitchens
      </motion.span>
      <span className="landing-counter-grid__rail-line landing-counter-grid__rail-line--static" aria-hidden />
    </motion.div>
  );
}

export function CounterParallaxGrid({ progress, pulse, isOpen: isOpenProp }: CounterParallaxGridProps) {
  const reduceMotion = useReducedMotion();
  const wrapRef = useRef<HTMLDivElement>(null);
  const { daypart, isOpen: isOpenHook } = useHallDaypart();
  const isOpen = isOpenProp ?? isOpenHook;
  const showStallCrowd = isOpen === true && !!pulse?.stallCrowd;
  const hotNames = new Set(LANDING_COPY.nowBoard[daypart].hotCounters);
  const [preloadVideos, setPreloadVideos] = useState(false);

  useEffect(() => {
    if (reduceMotion) return;
    const el = wrapRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setPreloadVideos(true);
          warmAllCounterVideos(HALL_COUNTERS.map((counter) => getCounterVideoSrc(counter.img)));
          observer.disconnect();
        }
      },
      { rootMargin: '320px 0px' },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [reduceMotion]);

  const gridMotion = reduceMotion
    ? {}
    : {
        initial: 'initial' as const,
        whileInView: 'animate' as const,
        viewport: { once: true, margin: '-60px' },
        variants: GRID_STAGGER,
      };

  return (
    <div ref={wrapRef} className="landing-counter-grid-wrap">
      {progress ? <CounterGridRail progress={progress} /> : <CounterGridRailStatic reduceMotion={reduceMotion} />}

      <motion.ul className="landing-counter-grid" {...gridMotion}>
        {HALL_COUNTERS.map((counter, index) => {
          const isHot = hotNames.has(counter.name);

          return progress ? (
            <CounterGridTile
              key={counter.id}
              counter={counter}
              progress={progress}
              index={index}
              isHot={isHot}
              reduceMotion={reduceMotion}
              stallSignal={pulse?.stallCrowd[counter.name]}
              showStallCrowd={showStallCrowd}
              preloadVideo={preloadVideos}
            />
          ) : (
            <CounterGridTileStatic
              key={counter.id}
              counter={counter}
              index={index}
              isHot={isHot}
              reduceMotion={reduceMotion}
              stallSignal={pulse?.stallCrowd[counter.name]}
              showStallCrowd={showStallCrowd}
              preloadVideo={preloadVideos}
            />
          );
        })}
      </motion.ul>
    </div>
  );
}
