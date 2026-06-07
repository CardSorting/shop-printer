'use client';

import { useRef } from 'react';
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import { PARALLAX_SPRING } from '../hooks/useParallax';
import { useSmoothProgress } from '../hooks/useSmoothProgress';
import { ParallaxMotion } from './ParallaxMotion';

type LandingSceneCutProps = {
  from: string;
  to: string;
  title: string;
  subtitle?: string;
  compact?: boolean;
};

const CUT_SPRING = { type: 'spring' as const, stiffness: 420, damping: 34, mass: 0.72 };

export function LandingSceneCut({ from, to, title, subtitle, compact = false }: LandingSceneCutProps) {
  const reduceMotion = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });
  const smooth = useSmoothProgress(scrollYProgress, PARALLAX_SPRING.cinematic);

  const glowY = useTransform(smooth, [0, 1], ['12%', '-14%']);
  const glowOpacity = useTransform(smooth, [0, 0.35, 0.65, 1], [0, 0.55, 0.48, 0]);
  const lineScale = useTransform(smooth, [0.18, 0.42, 0.58, 0.82], [0, 1, 1, 0]);
  const lineX = useTransform(smooth, [0, 1], ['-4%', '4%']);
  const contentY = useTransform(smooth, [0, 0.45, 1], ['8%', '0%', '-10%']);
  const contentOpacity = useTransform(smooth, [0, 0.22, 0.78, 1], [0, 1, 1, 0.35]);
  const flashOpacity = useTransform(smooth, [0.38, 0.48, 0.52, 0.62], [0, 0.72, 0.72, 0]);
  const titleScale = useTransform(smooth, [0.22, 0.48, 0.72], [0.94, 1, 1.02]);

  return (
    <div ref={ref} className={`landing-scene-cut${compact ? ' landing-scene-cut--compact' : ''}`} aria-hidden>
      <ParallaxMotion modes={['fade']} opacity={flashOpacity} className="landing-scene-cut__flash" aria-hidden />
      <ParallaxMotion
        modes={['shift-y', 'fade']}
        y={glowY}
        opacity={glowOpacity}
        className="landing-scene-cut__glow"
      />

      <ParallaxMotion modes={['transform', 'fade']} y={contentY} opacity={contentOpacity} className="landing-scene-cut__inner">
        <motion.div
          className="landing-scene-cut__chapters-wrap"
          initial={reduceMotion ? false : { opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-18%' }}
          transition={reduceMotion ? { duration: 0 } : CUT_SPRING}
        >
          <p className="landing-scene-cut__chapters">
            <motion.span
              initial={reduceMotion ? false : { opacity: 0, x: -8 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: '-18%' }}
              transition={reduceMotion ? { duration: 0 } : { ...CUT_SPRING, delay: 0.02 }}
            >
              {from}
            </motion.span>
            <motion.span
              className="landing-scene-cut__arrow"
              aria-hidden
              initial={reduceMotion ? false : { scaleX: 0, opacity: 0.35 }}
              whileInView={{ scaleX: 1, opacity: 1 }}
              viewport={{ once: true, margin: '-18%' }}
              transition={reduceMotion ? { duration: 0 } : { ...CUT_SPRING, delay: 0.06 }}
            />
            <motion.span
              initial={reduceMotion ? false : { opacity: 0, x: 8 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: '-18%' }}
              transition={reduceMotion ? { duration: 0 } : { ...CUT_SPRING, delay: 0.1 }}
            >
              {to}
            </motion.span>
          </p>
        </motion.div>

        <ParallaxMotion modes={['transform', 'scale-x']} x={lineX} scaleX={lineScale} className="landing-scene-cut__wipe" aria-hidden />

        <ParallaxMotion modes={['transform']} scale={titleScale} className="landing-scene-cut__title-wrap">
        <motion.h2
          className="landing-scene-cut__title font-display"
          initial={reduceMotion ? false : { opacity: 0, y: 24, clipPath: 'inset(100% 0 0 0 round 2px)' }}
          whileInView={{ opacity: 1, y: 0, clipPath: 'inset(0% 0 0 0 round 2px)' }}
          viewport={{ once: true, margin: '-16%' }}
          transition={reduceMotion ? { duration: 0 } : { ...CUT_SPRING, delay: 0.06 }}
        >
          {title}
        </motion.h2>
        </ParallaxMotion>

        {subtitle && (
          <motion.p
            className="landing-scene-cut__subtitle"
            initial={reduceMotion ? false : { opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-14%' }}
            transition={reduceMotion ? { duration: 0 } : { ...CUT_SPRING, delay: 0.14 }}
          >
            {subtitle}
          </motion.p>
        )}
      </ParallaxMotion>
    </div>
  );
}
