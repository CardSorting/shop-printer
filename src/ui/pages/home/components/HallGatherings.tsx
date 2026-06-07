'use client';

import Link from 'next/link';
import { useRef } from 'react';
import { motion, useScroll, useTransform, type MotionValue } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { STAGGER_CONTAINER_VARIANTS } from '@ui/animations';
import { LANDING_COPY } from '../copy';
import { HALL_GATHERINGS } from '../constants';
import { PARALLAX_SPRING, useStaggeredParallaxX, useStaggeredParallaxY, useStaggeredParallaxRotateY } from '../hooks/useParallax';
import { useSmoothProgress } from '../hooks/useSmoothProgress';
import { HallCta } from './HallCta';
import { CARD_LIFT_HOVER, CARD_TAP, CHIP_POP_HOVER, MICRO_SPRING_SNAPPY } from './MicroMotion';
import { ParallaxMotion } from './ParallaxMotion';

const { gatherings } = LANDING_COPY;

const CARD_VARIANTS = {
  initial: { opacity: 0, y: 28 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.62, ease: [0.16, 1, 0.3, 1] as const },
  },
};

function GatheringParallaxItem({
  progress,
  index,
  children,
}: {
  progress: MotionValue<number>;
  index: number;
  children: React.ReactNode;
}) {
  const y = useStaggeredParallaxY(progress, index, 2, [3, -4]);
  const x = useStaggeredParallaxX(progress, index, [-2, 2]);
  const rotateY = useStaggeredParallaxRotateY(progress, index, 2, [-3, 3]);

  return (
    <ParallaxMotion modes={['transform']} x={x} y={y} rotateY={rotateY}>
      {children}
    </ParallaxMotion>
  );
}

export function HallGatherings() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });
  const smooth = useSmoothProgress(scrollYProgress, PARALLAX_SPRING.ambient);
  const panelY = useTransform(smooth, [0, 0.5, 1], ['5%', '-1%', '-6%']);
  const headerY = useTransform(smooth, [0, 1], ['4%', '-5%']);
  const footY = useTransform(smooth, [0, 1], ['3%', '-4%']);
  const glowOpacity = useTransform(smooth, [0, 0.45, 1], [0, 0.55, 0.25]);
  const glowY = useTransform(smooth, [0, 1], ['-8%', '12%']);
  const flowX = useTransform(smooth, [0, 1], ['-4%', '4%']);
  const flowScale = useTransform(smooth, [0.12, 0.52], [0, 1]);
  const headlineX = useTransform(smooth, [0, 1], ['0%', '-3%']);
  const headlineClip = useTransform(smooth, [0.05, 0.24], ['inset(100% 0 0 0 round 2px)', 'inset(0% 0 0 0 round 2px)']);
  const ruleScale = useTransform(smooth, [0.1, 0.3], [0, 1]);
  const subOpacity = useTransform(smooth, [0.14, 0.32], [0, 1]);
  const subY = useTransform(smooth, [0.14, 0.34], ['1rem', '0rem']);

  return (
    <motion.aside
      ref={ref}
      className="landing-gatherings hall-glass"
      aria-labelledby="gatherings-heading"
    >
      <ParallaxMotion
        modes={['shift-y', 'fade']}
        y={glowY}
        opacity={glowOpacity}
        className="landing-gatherings__glow"
        aria-hidden
      />

      <ParallaxMotion modes={['shift-y']} y={panelY} className="landing-gatherings__panel">
        <ParallaxMotion modes={['shift-y']} y={headerY}>
        <header className="landing-gatherings__header">
          <div className="landing-gatherings__intro">
            <div className="landing-gatherings__header-top">
              <p className="landing-gatherings__label">{gatherings.label}</p>
              <span className="hall-badge">{gatherings.stamp}</span>
            </div>
            <ParallaxMotion modes={['shift-y', 'clip']} clipPath={headlineClip}>
            <h3 id="gatherings-heading" className="landing-gatherings__headline font-display">
              {gatherings.headline}
            </h3>
            </ParallaxMotion>
            <ParallaxMotion modes={['scale-x']} scaleX={ruleScale} className="hall-rule landing-gatherings__rule" aria-hidden />
            <ParallaxMotion modes={['shift-y', 'fade']} y={subY} opacity={subOpacity}>
            <p className="landing-gatherings__sub">{gatherings.sub}</p>
            </ParallaxMotion>
            <p className="landing-gatherings__aside">{gatherings.aside}</p>
          </div>

          <HallCta
            href={gatherings.cta.href}
            label={gatherings.cta.label}
            variant="primary"
            dark
            className="landing-gatherings__cta landing-gatherings__cta--header"
            icon={<ArrowRight className="h-4 w-4" aria-hidden />}
          />
        </header>
        </ParallaxMotion>

        <ParallaxMotion modes={['shift-x']} x={flowX}>
        <div className="landing-gatherings__flow" aria-hidden>
          <span>{gatherings.flowStart}</span>
          <span className="landing-gatherings__flow-track">
            <ParallaxMotion modes={['scale-x']} scaleX={flowScale} className="landing-gatherings__flow-fill" />
          </span>
          <span>{gatherings.flowEnd}</span>
        </div>
        </ParallaxMotion>

        <motion.ol
          className="landing-gatherings__grid"
          initial="initial"
          whileInView="animate"
          viewport={{ once: true, margin: '-40px' }}
          variants={STAGGER_CONTAINER_VARIANTS}
        >
          {HALL_GATHERINGS.map((item, index) => {
            const isBuyout = item.id === 'buyout';

            return (
            <motion.li
              key={item.id}
              className={`landing-gatherings__item${isBuyout ? ' landing-gatherings__item--featured' : ''}`}
              variants={CARD_VARIANTS}
              transition={{ delay: index * 0.08 }}
            >
              <GatheringParallaxItem progress={smooth} index={index}>
              <motion.article
                className="landing-gatherings__card"
                whileHover={CARD_LIFT_HOVER}
                whileTap={CARD_TAP}
              >
                  <header className="landing-gatherings__card-head">
                    <span className="landing-gatherings__step">{item.step}</span>
                    <span className="landing-gatherings__scale">{item.scale}</span>
                  </header>
                  <h4 className="landing-gatherings__card-title font-display">{item.label}</h4>
                  <ul className="landing-gatherings__chips">
                    {item.highlights.map((highlight, chipIndex) => (
                      <motion.li
                        key={highlight}
                        whileHover={CHIP_POP_HOVER}
                        transition={MICRO_SPRING_SNAPPY}
                      >
                        {highlight}
                      </motion.li>
                    ))}
                  </ul>
              </motion.article>
              </GatheringParallaxItem>
            </motion.li>
            );
          })}
        </motion.ol>

        <ParallaxMotion modes={['shift-y']} y={footY}>
        <footer className="landing-gatherings__foot">
          <p className="landing-gatherings__foot-note">{gatherings.footNote}</p>
          <HallCta
            href={gatherings.cta.href}
            label={gatherings.cta.label}
            variant="ghost"
            className="landing-gatherings__cta landing-gatherings__cta--footer"
            icon={<ArrowRight className="h-4 w-4" aria-hidden />}
          />
        </footer>
        </ParallaxMotion>
      </ParallaxMotion>
    </motion.aside>
  );
}
