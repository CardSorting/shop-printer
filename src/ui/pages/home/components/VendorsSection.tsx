'use client';

import { motion, useReducedMotion, useTransform, type Variants } from 'framer-motion';
import { LANDING_COPY } from '../copy';
import { PARALLAX_SPRING, useScrollVelocityScale, useSectionParallax } from '../hooks/useParallax';
import { useHallDaypart } from '../hooks/useHallDaypart';
import { useSimulatedHallPulse } from '../hooks/useSimulatedHallPulse';
import { useSmoothProgress } from '../hooks/useSmoothProgress';
import { CounterParallaxGrid } from './CounterParallaxGrid';
import { ParallaxMotion } from './ParallaxMotion';
import { SectionScrollSeam } from './SectionScrollSeam';
import { SectionLabelMotion } from './SectionLabelMotion';
import { StudioContainer, StudioHeading } from './StudioShell';
import { VendorsHallStrip } from './VendorsHallStrip';

const { vendors, nowBoard } = LANDING_COPY;

const HEADER_STAGGER: Variants = {
  initial: {},
  animate: {
    transition: { staggerChildren: 0.09, delayChildren: 0.04 },
  },
};

const HEADER_LABEL: Variants = {
  initial: { opacity: 0, x: -18, filter: 'blur(6px)' },
  animate: {
    opacity: 1,
    x: 0,
    filter: 'blur(0px)',
    transition: { duration: 0.62, ease: [0.16, 1, 0.3, 1] },
  },
};

const HEADER_TITLE_LOCKUP: Variants = {
  initial: {},
  animate: {
    transition: { staggerChildren: 0.1, delayChildren: 0.06 },
  },
};

const HEADER_TITLE_LINE: Variants = {
  initial: { y: '108%', opacity: 0.85 },
  animate: {
    y: 0,
    opacity: 1,
    transition: { duration: 0.82, ease: [0.16, 1, 0.3, 1] },
  },
};

const HEADER_RULE: Variants = {
  initial: { scaleX: 0, opacity: 0 },
  animate: {
    scaleX: 1,
    opacity: 1,
    transition: { duration: 0.68, ease: [0.16, 1, 0.3, 1], delay: 0.08 },
  },
};

const HEADER_LEDE: Variants = {
  initial: { opacity: 0, y: 22, filter: 'blur(6px)' },
  animate: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { duration: 0.72, ease: [0.16, 1, 0.3, 1], delay: 0.04 },
  },
};

const HEADER_STRIP: Variants = {
  initial: { opacity: 0, y: 18 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.68, ease: [0.16, 1, 0.3, 1], delay: 0.14 },
  },
};

export function VendorsSection() {
  const reduceMotion = useReducedMotion();
  const { daypart, isOpen } = useHallDaypart();
  const { pulse } = useSimulatedHallPulse(nowBoard[daypart].hotCounters);
  const { ref, scrollYProgress } = useSectionParallax(['start end', 'end start']);
  const smooth = useSmoothProgress(scrollYProgress, PARALLAX_SPRING.cinematic);
  const headerY = useTransform(smooth, [0, 0.45, 1], ['5%', '-2%', '-7%']);
  const titleY = useTransform(smooth, [0, 1], ['4%', '-7%']);
  const accentX = useTransform(smooth, [0, 1], ['2%', '-5%']);
  const accentY = useTransform(smooth, [0, 1], ['6%', '-4%']);
  const ledeY = useTransform(smooth, [0, 1], ['3%', '-6%']);
  const ledeOpacity = useTransform(smooth, [0, 0.14, 0.32], [0, 0.55, 1]);
  const glowOpacity = useTransform(smooth, [0, 0.4, 1], [0, 0.42, 0.18]);
  const glowY = useTransform(smooth, [0, 1], ['-10%', '14%']);
  const glowBackY = useTransform(smooth, [0, 1], ['6%', '-12%']);
  const glowScale = useTransform(smooth, [0, 0.35, 1], [0.92, 1.04, 1.08]);
  const watermarkX = useTransform(smooth, [0, 1], ['-3%', '5%']);
  const watermarkY = useTransform(smooth, [0, 1], ['2%', '-8%']);
  const watermarkOpacity = useTransform(smooth, [0, 0.2, 0.55, 1], [0, 0.04, 0.035, 0.02]);
  const meshY = useTransform(smooth, [0, 1], ['-5%', '9%']);
  const meshX = useTransform(smooth, [0, 1], ['-3%', '4%']);
  const meshOpacity = useTransform(smooth, [0, 0.35, 1], [0, 0.2, 0.09]);
  const meshRotate = useTransform(smooth, [0, 1], ['-0.6deg', '0.5deg']);
  const titleClip = useTransform(smooth, [0.02, 0.24], ['inset(100% 0 0 0 round 3px)', 'inset(0% 0 0 0 round 3px)']);
  const accentClip = useTransform(smooth, [0.06, 0.28], ['inset(0 0 100% 0 round 2px)', 'inset(0 0 0 0 round 2px)']);
  const ruleScale = useTransform(smooth, [0.08, 0.28], [0, 1]);
  const headerOpacity = useTransform(smooth, [0, 0.1, 0.88, 1], [0.35, 1, 1, 0.82]);
  const gridSectionY = useTransform(smooth, [0, 0.55, 1], ['7%', '-2%', '-6%']);
  const gridSectionOpacity = useTransform(smooth, [0, 0.12, 0.28], [0.35, 0.9, 1]);
  const gridSectionScale = useScrollVelocityScale(smooth, [1, 1.018], 1400);
  const gridRotateX = useTransform(smooth, [0, 0.45, 1], ['2.2deg', '0deg', '-1.4deg']);
  const entrySweep = useTransform(smooth, [0, 0.12], [0, 1]);
  const cinemaFadeOpacity = useTransform(smooth, [0, 0.08, 0.22, 0.92, 1], [0.55, 0.28, 0.12, 0.1, 0.22]);

  const headerMotion = reduceMotion
    ? {}
    : {
        initial: 'initial' as const,
        whileInView: 'animate' as const,
        viewport: { once: true, margin: '-80px' },
        variants: HEADER_STAGGER,
      };

  return (
    <section id="landing-vendors" ref={ref} className="landing-vendors landing-vendors--hall landing-vendors--cinematic grain-overlay landing-parallax-scene">
      <SectionScrollSeam targetRef={ref} variant="dark" />
      <span className="landing-hero__cinema-rail landing-hero__cinema-rail--head landing-vendors__cinema-rail" aria-hidden />
      <ParallaxMotion modes={['fade']} opacity={cinemaFadeOpacity} className="landing-hero__cinema-fade landing-vendors__cinema-fade" aria-hidden />
      <ParallaxMotion
        modes={['scale-x']}
        scaleX={entrySweep}
        className="landing-vendors__entry-sweep"
        aria-hidden
      />

      <ParallaxMotion
        modes={['transform', 'fade']}
        y={glowBackY}
        scale={glowScale}
        opacity={glowOpacity}
        className="landing-vendors__parallax-glow landing-vendors__parallax-glow--back"
        aria-hidden
      />
      <ParallaxMotion
        modes={['shift-y', 'fade']}
        y={glowY}
        opacity={glowOpacity}
        className="landing-vendors__parallax-glow"
        aria-hidden
      />

      <ParallaxMotion
        modes={['transform', 'fade']}
        x={meshX}
        y={meshY}
        rotate={meshRotate}
        opacity={meshOpacity}
        className="landing-vendors__depth-mesh"
        aria-hidden
      />

      <ParallaxMotion
        modes={['shift-x', 'shift-y', 'fade']}
        x={watermarkX}
        y={watermarkY}
        opacity={watermarkOpacity}
        className="landing-vendors__watermark font-display"
        aria-hidden
      >
        {vendors.label}
      </ParallaxMotion>

      <StudioContainer>
        <ParallaxMotion modes={['shift-y', 'fade']} y={headerY} opacity={headerOpacity}>
          <motion.div
            {...headerMotion}
            className="landing-vendors__header landing-vendors__header--simple landing-vendors__header--cinematic"
          >
            <div className="landing-vendors__header-copy">
              <motion.div variants={reduceMotion ? undefined : HEADER_LABEL}>
                <SectionLabelMotion label={vendors.label} dark hall={false} />
              </motion.div>

              <ParallaxMotion modes={['shift-y', 'clip']} y={titleY} clipPath={titleClip}>
                <motion.div variants={reduceMotion ? undefined : HEADER_TITLE_LOCKUP} className="landing-vendors__headline-lockup">
                  <StudioHeading size="display" className="landing-vendors__title">
                    <span className="landing-vendors__headline-line">
                      <motion.span className="landing-vendors__headline-text font-display" variants={reduceMotion ? undefined : HEADER_TITLE_LINE}>
                        {vendors.headline[0]}
                      </motion.span>
                    </span>
                    <span className="landing-vendors__headline-line">
                      <ParallaxMotion
                        modes={['shift-x', 'shift-y', 'clip']}
                        x={accentX}
                        y={accentY}
                        clipPath={accentClip}
                        as="span"
                        className="landing-heading__accent-light landing-vendors__headline-accent"
                      >
                        <motion.span className="landing-vendors__headline-text font-display" variants={reduceMotion ? undefined : HEADER_TITLE_LINE}>
                          {vendors.headline[1]}
                        </motion.span>
                      </ParallaxMotion>
                    </span>
                  </StudioHeading>
                </motion.div>
              </ParallaxMotion>

              <motion.div variants={reduceMotion ? undefined : HEADER_RULE}>
                <ParallaxMotion modes={['scale-x']} scaleX={ruleScale} className="hall-rule landing-vendors__rule" aria-hidden />
              </motion.div>

              <motion.div variants={reduceMotion ? undefined : HEADER_LEDE}>
                <ParallaxMotion modes={['shift-y', 'fade']} y={ledeY} opacity={ledeOpacity}>
                  <p className="landing-vendors__lede landing-vendors__lede--inline">{vendors.lede}</p>
                </ParallaxMotion>
              </motion.div>

              <motion.div variants={reduceMotion ? undefined : HEADER_STRIP}>
                <VendorsHallStrip pulse={pulse} isOpen={isOpen} />
              </motion.div>
            </div>
          </motion.div>
        </ParallaxMotion>

        <ParallaxMotion
          modes={['transform', 'fade']}
          y={gridSectionY}
          opacity={gridSectionOpacity}
          scale={gridSectionScale}
          rotateX={gridRotateX}
          className="landing-vendors__grid-stage"
        >
          <CounterParallaxGrid progress={smooth} pulse={pulse} isOpen={isOpen} />
        </ParallaxMotion>
      </StudioContainer>

      <span className="landing-hero__cinema-rail landing-hero__cinema-rail--foot landing-vendors__cinema-rail" aria-hidden />
      <SectionScrollSeam targetRef={ref} variant="dark" className="landing-section-seam--exit" />
    </section>
  );
}
