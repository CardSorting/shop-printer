'use client';

import { useRef } from 'react';
import Image from 'next/image';
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import type { HALL_FOOD_PARALLAX_FRAMES } from '../constants';
import {
  PARALLAX_SPRING,
  useParallaxTilt,
  useScrollVelocityBlur,
} from '../hooks/useParallax';
import { useSmoothProgress } from '../hooks/useSmoothProgress';
import { ParallaxMotion } from './ParallaxMotion';
import { SectionScrollSeam } from './SectionScrollSeam';

type FoodParallaxFrame = (typeof HALL_FOOD_PARALLAX_FRAMES)[number];

type HallFoodParallaxBreakProps = {
  frame: FoodParallaxFrame;
  step: number;
  total: number;
};

export function HallFoodParallaxBreak({ frame, step, total }: HallFoodParallaxBreakProps) {
  const ref = useRef<HTMLElement>(null);
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start start', 'end end'],
  });
  const smooth = useSmoothProgress(scrollYProgress, PARALLAX_SPRING.cinematic);
  const velocityBlur = useScrollVelocityBlur(smooth, 3.5);

  const isRight = frame.align === 'right';

  const imageY = useTransform(smooth, [0, 0.28, 0.72, 1], ['-34%', '-10%', '10%', '34%']);
  const imageInnerY = useTransform(smooth, [0, 0.42, 1], ['-18%', '0%', '20%']);
  const imageInnerScale = useTransform(smooth, [0, 0.38, 0.5, 0.62, 1], [1.14, 1.08, 1, 1.08, 1.14]);
  const imageX = useTransform(smooth, [0, 0.5, 1], isRight ? ['14%', '0%', '-12%'] : ['-14%', '0%', '12%']);
  const imageScale = useTransform(smooth, [0, 0.38, 0.62, 1], [1.48, 1.04, 1.04, 1.28]);
  const imageRotate = useTransform(smooth, [0, 0.5, 1], isRight ? [4.5, 0, -4.5] : [-4.5, 0, 4.5]);
  const imageFilter = useTransform(
    smooth,
    [0, 0.14, 0.46, 0.54, 0.78, 1],
    [
      'brightness(0.86) saturate(1.1) blur(5px)',
      'brightness(1) saturate(1.14) blur(0px)',
      'brightness(1.04) saturate(1.08) blur(0px)',
      'brightness(1) saturate(1) blur(0px)',
      'brightness(0.9) saturate(0.96) blur(1px)',
      'brightness(0.8) saturate(0.9) blur(4px)',
    ],
  );

  const bokehBackY = useTransform(smooth, [0, 1], ['-18%', '24%']);
  const bokehBackX = useTransform(smooth, [0, 1], isRight ? ['-8%', '12%'] : ['8%', '-12%']);
  const bokehFrontY = useTransform(smooth, [0, 1], ['12%', '-20%']);
  const bokehFrontX = useTransform(smooth, [0, 1], isRight ? ['6%', '-10%'] : ['-6%', '10%']);
  const bokehBackOpacity = useTransform(smooth, [0, 0.35, 0.65, 1], [0.5, 0.75, 0.65, 0.35]);
  const bokehFrontOpacity = useTransform(smooth, [0, 0.4, 0.6, 1], [0.35, 0.6, 0.55, 0.28]);

  const gridY = useTransform(smooth, [0, 1], ['-14%', '16%']);
  const gridX = useTransform(smooth, [0, 1], isRight ? ['5%', '-8%'] : ['-5%', '8%']);
  const gridOpacity = useTransform(smooth, [0, 0.32, 0.68, 1], [0.12, 0.38, 0.34, 0.1]);
  const gridRotate = useTransform(smooth, [0, 1], isRight ? ['-1.5deg', '1deg'] : ['1.5deg', '-1deg']);

  const frameY = useTransform(smooth, [0, 1], ['8%', '-14%']);
  const frameOpacity = useTransform(smooth, [0.36, 0.52, 0.64], [0, 0.42, 0]);
  const frameScale = useTransform(smooth, [0.36, 0.52], [0.92, 1]);

  const vignetteOpacity = useTransform(smooth, [0, 0.28, 0.72, 1], [0.65, 0.2, 0.34, 0.72]);
  const vignetteY = useTransform(smooth, [0, 1], ['-12%', '16%']);

  const indexOpacity = useTransform(smooth, [0, 0.16, 0.52], [0.28, 0.12, 0]);
  const indexY = useTransform(smooth, [0, 0.52], ['8%', '-28%']);
  const indexX = useTransform(smooth, [0, 0.52], isRight ? ['-10%', '18%'] : ['10%', '-18%']);
  const indexScale = useTransform(smooth, [0, 0.24, 0.52], [1.28, 1, 0.82]);

  const scrimOpacity = useTransform(smooth, [0, 0.36, 0.54, 0.72, 1], [0, 0, 0.78, 0.88, 0.96]);
  const scrimY = useTransform(smooth, [0, 1], ['16%', '-12%']);

  const railTopOpacity = useTransform(smooth, [0, 0.14, 0.42, 0.78, 1], [0.92, 0.5, 0.22, 0.42, 0.82]);
  const railBottomOpacity = useTransform(smooth, [0, 0.2, 0.55, 0.9, 1], [0.72, 0.32, 0.14, 0.36, 0.78]);

  const hintOpacity = useTransform(smooth, [0, 0.1, 0.2], [1, 0.55, 0]);
  const hintY = useTransform(smooth, [0, 0.2], ['0rem', '-1.25rem']);

  const progressScale = useTransform(smooth, [0, 1], [0, 1]);

  const contentY = useTransform(smooth, [0, 0.5, 1], ['8%', '-2%', '-14%']);
  const contentX = useTransform(smooth, [0, 1], isRight ? ['6%', '-8%'] : ['-6%', '8%']);
  const contentTiltX = useParallaxTilt(smooth, 'x', [3, -2.5], [0, 0.55]);
  const contentTiltY = useParallaxTilt(smooth, 'y', isRight ? [-2.5, 2] : [2.5, -2], [0, 0.55]);

  const kickerOpacity = useTransform(smooth, [0.38, 0.56], [0, 1]);
  const kickerY = useTransform(smooth, [0.38, 0.58], ['2rem', '0rem']);
  const kickerX = useTransform(smooth, [0.38, 0.6], isRight ? ['1.75rem', '0rem'] : ['-1.75rem', '0rem']);

  const ruleScale = useTransform(smooth, [0.44, 0.64], [0, 1]);

  const captionOpacity = useTransform(smooth, [0.46, 0.64], [0, 1]);
  const captionY = useTransform(smooth, [0.46, 0.66], ['2.5rem', '0rem']);
  const captionClip = useTransform(smooth, [0.46, 0.66], ['inset(100% 0 0 0)', 'inset(0% 0 0 0)']);

  const detailOpacity = useTransform(smooth, [0.54, 0.72], [0, 1]);
  const detailY = useTransform(smooth, [0.54, 0.72], ['1.25rem', '0rem']);

  const exitOpacity = useTransform(smooth, [0.8, 0.92], [0, 1]);
  const exitY = useTransform(smooth, [0.8, 0.94], ['1.15rem', '0rem']);

  return (
    <section
      id={`landing-food-${frame.id}`}
      ref={ref}
      className={`landing-food-pass landing-food-pass--pin landing-food-pass--${frame.align} landing-parallax-scene`}
      data-food-pass={frame.id}
      aria-labelledby={`food-caption-${frame.id}`}
    >
      <SectionScrollSeam targetRef={ref} variant="dark" />
      <div className="landing-food-pass__pin">
        <ParallaxMotion
          modes={['fade']}
          opacity={railTopOpacity}
          className="landing-food-pass__cinema-rail landing-food-pass__cinema-rail--top"
          aria-hidden
        />
        <ParallaxMotion
          modes={['fade']}
          opacity={railBottomOpacity}
          className="landing-food-pass__cinema-rail landing-food-pass__cinema-rail--bottom"
          aria-hidden
        />
        <ParallaxMotion
          modes={['transform', 'filter']}
          x={imageX}
          y={imageY}
          scale={imageScale}
          rotate={imageRotate}
          filter={imageFilter}
          className="landing-food-pass__media"
        >
          <ParallaxMotion
            modes={['transform', 'filter']}
            y={imageInnerY}
            scale={imageInnerScale}
            filter={velocityBlur}
            className="landing-food-pass__media-inner"
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
          <div className="landing-food-pass__grain" aria-hidden />
        </ParallaxMotion>

        <ParallaxMotion
          modes={['transform', 'fade']}
          x={gridX}
          y={gridY}
          rotate={gridRotate}
          opacity={gridOpacity}
          className="landing-food-pass__grid"
          aria-hidden
        />

        <ParallaxMotion
          modes={['transform', 'fade']}
          x={bokehBackX}
          y={bokehBackY}
          opacity={bokehBackOpacity}
          className={`landing-food-pass__bokeh landing-food-pass__bokeh--back landing-food-pass__bokeh--${frame.align}`}
          aria-hidden
        />
        <ParallaxMotion
          modes={['transform', 'fade']}
          x={bokehFrontX}
          y={bokehFrontY}
          opacity={bokehFrontOpacity}
          className={`landing-food-pass__bokeh landing-food-pass__bokeh--front landing-food-pass__bokeh--${frame.align}`}
          aria-hidden
        />

        <ParallaxMotion
          modes={['transform', 'fade']}
          y={frameY}
          scale={frameScale}
          opacity={frameOpacity}
          className={`landing-food-pass__depth-frame landing-food-pass__depth-frame--${frame.align}`}
          aria-hidden
        />

        <div className="landing-food-pass__fade" aria-hidden />

        <ParallaxMotion
          modes={['shift-y', 'fade']}
          y={vignetteY}
          opacity={vignetteOpacity}
          className="landing-food-pass__vignette"
          aria-hidden
        />

        <ParallaxMotion
          modes={['shift-y', 'fade']}
          y={scrimY}
          opacity={scrimOpacity}
          className="landing-food-pass__scrim"
          aria-hidden
        />

        <ParallaxMotion
          modes={['transform', 'fade']}
          x={indexX}
          y={indexY}
          scale={indexScale}
          opacity={indexOpacity}
          className="landing-food-pass__index font-display"
          aria-hidden
        >
          {frame.index}
        </ParallaxMotion>

        <ParallaxMotion
          modes={['shift-y', 'fade']}
          y={hintY}
          opacity={hintOpacity}
          className="landing-food-pass__scroll-hint"
          aria-hidden
        >
          <motion.span
            animate={reduceMotion ? undefined : { y: [0, 5, 0], opacity: [0.72, 1, 0.72] }}
            transition={reduceMotion ? undefined : { duration: 1.85, repeat: Infinity, ease: 'easeInOut' }}
          >
            Keep scrolling
          </motion.span>
        </ParallaxMotion>

        <div className="landing-food-pass__story" aria-hidden>
          <span className="landing-food-pass__story-label">
            {step} of {total}
          </span>
          <div className="landing-food-pass__story-track">
            <ParallaxMotion className="landing-food-pass__story-fill" modes={['scale-x']} scaleX={progressScale} />
          </div>
        </div>

        <ParallaxMotion
          modes={['transform']}
          x={contentX}
          y={contentY}
          rotateX={contentTiltX}
          rotateY={contentTiltY}
          className={`landing-food-pass__content landing-food-pass__content--${frame.align}`}
        >
          <ParallaxMotion modes={['shift-x', 'shift-y', 'fade']} x={kickerX} y={kickerY} opacity={kickerOpacity}>
            <p className="landing-food-pass__kicker">{frame.kicker}</p>
          </ParallaxMotion>

          <ParallaxMotion modes={['scale-x']} scaleX={ruleScale} className="landing-food-pass__rule" aria-hidden />

          <ParallaxMotion
            modes={['shift-y', 'fade', 'clip']}
            y={captionY}
            opacity={captionOpacity}
            clipPath={captionClip}
            className="landing-food-pass__caption-wrap"
          >
            <p id={`food-caption-${frame.id}`} className="landing-food-pass__caption font-display">
              {frame.caption}
            </p>
          </ParallaxMotion>

          {frame.detail && (
            <ParallaxMotion modes={['shift-y', 'fade']} y={detailY} opacity={detailOpacity}>
              <p className="landing-food-pass__detail">{frame.detail}</p>
            </ParallaxMotion>
          )}

          <ParallaxMotion modes={['shift-y', 'fade']} y={exitY} opacity={exitOpacity}>
            <p className="landing-food-pass__next-hint">
              <motion.span
                animate={reduceMotion ? undefined : { y: [0, 4, 0], opacity: [0.65, 1, 0.65] }}
                transition={reduceMotion ? undefined : { duration: 2, repeat: Infinity, ease: 'easeInOut', delay: 0.3 }}
              >
                Continue scrolling ↓
              </motion.span>
            </p>
          </ParallaxMotion>
        </ParallaxMotion>
      </div>
    </section>
  );
}
