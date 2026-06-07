'use client';

import { useRef } from 'react';
import Image from 'next/image';
import { useScroll, useTransform } from 'framer-motion';
import type { HALL_FOOD_PARALLAX_FRAMES } from '../constants';
import { useSmoothProgress } from '../hooks/useSmoothProgress';
import { ParallaxMotion } from './ParallaxMotion';

type FoodParallaxFrame = (typeof HALL_FOOD_PARALLAX_FRAMES)[number];

type HallFoodParallaxBreakProps = {
  frame: FoodParallaxFrame;
};

export function HallFoodParallaxBreak({ frame }: HallFoodParallaxBreakProps) {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start start', 'end end'],
  });
  const smooth = useSmoothProgress(scrollYProgress, 78, 24);

  const imageY = useTransform(smooth, [0, 1], ['-14%', '14%']);
  const imageScale = useTransform(smooth, [0, 0.46, 1], [1.2, 1.03, 1.1]);
  const imageRotate = useTransform(
    smooth,
    [0, 1],
    frame.align === 'right' ? ['1.25deg', '-1.25deg'] : ['-1.25deg', '1.25deg'],
  );
  const imageFilter = useTransform(
    smooth,
    [0, 0.52, 1],
    ['brightness(1) saturate(1)', 'brightness(1) saturate(1)', 'brightness(0.88) saturate(0.96)'],
  );

  const indexOpacity = useTransform(smooth, [0, 0.22, 0.52], [0.16, 0.14, 0]);
  const indexY = useTransform(smooth, [0, 0.52], ['0%', '-18%']);

  const scrimOpacity = useTransform(smooth, [0, 0.44, 0.58, 1], [0, 0, 0.78, 0.88]);

  const kickerOpacity = useTransform(smooth, [0.46, 0.6], [0, 1]);
  const kickerY = useTransform(smooth, [0.46, 0.62], ['1.25rem', '0rem']);

  const ruleScale = useTransform(smooth, [0.5, 0.68], [0, 1]);

  const captionOpacity = useTransform(smooth, [0.52, 0.68], [0, 1]);
  const captionY = useTransform(smooth, [0.52, 0.7], ['1.75rem', '0rem']);

  const detailOpacity = useTransform(smooth, [0.6, 0.76], [0, 1]);
  const detailY = useTransform(smooth, [0.6, 0.76], ['0.85rem', '0rem']);

  return (
    <section
      ref={ref}
      className={`landing-food-pass landing-food-pass--pin landing-food-pass--${frame.align}`}
      data-food-pass={frame.id}
      aria-labelledby={`food-caption-${frame.id}`}
    >
      <div className="landing-food-pass__pin">
        <ParallaxMotion
          modes={['transform', 'filter']}
          y={imageY}
          scale={imageScale}
          rotate={imageRotate}
          filter={imageFilter}
          className="landing-food-pass__media"
        >
          <Image
            src={frame.src}
            alt={frame.alt}
            fill
            sizes="100vw"
            className="landing-food-pass__image"
            style={{ objectPosition: frame.objectPosition }}
            priority={false}
          />
        </ParallaxMotion>

        <div className="landing-food-pass__fade" aria-hidden />

        <ParallaxMotion
          modes={['fade']}
          opacity={scrimOpacity}
          className="landing-food-pass__scrim"
          aria-hidden
        />

        <ParallaxMotion
          modes={['shift-y', 'fade']}
          y={indexY}
          opacity={indexOpacity}
          className="landing-food-pass__index font-display"
          aria-hidden
        >
          {frame.index}
        </ParallaxMotion>

        <div className={`landing-food-pass__content landing-food-pass__content--${frame.align}`}>
          <ParallaxMotion modes={['shift-y', 'fade']} y={kickerY} opacity={kickerOpacity}>
            <p className="landing-food-pass__kicker">{frame.kicker}</p>
          </ParallaxMotion>

          <ParallaxMotion modes={['scale-x']} scaleX={ruleScale} className="landing-food-pass__rule" aria-hidden />

          <ParallaxMotion modes={['shift-y', 'fade']} y={captionY} opacity={captionOpacity}>
            <p id={`food-caption-${frame.id}`} className="landing-food-pass__caption font-display">
              {frame.caption}
            </p>
          </ParallaxMotion>

          {frame.detail && (
            <ParallaxMotion modes={['shift-y', 'fade']} y={detailY} opacity={detailOpacity}>
              <p className="landing-food-pass__detail">{frame.detail}</p>
            </ParallaxMotion>
          )}
        </div>
      </div>
    </section>
  );
}
