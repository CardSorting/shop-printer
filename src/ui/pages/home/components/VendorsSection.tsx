'use client';

import { useRef } from 'react';
import { motion, useTransform } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { SLIDE_UP_VARIANTS } from '@ui/animations';
import { LANDING_COPY } from '../copy';
import { PARALLAX_SPRING, useSectionParallax } from '../hooks/useParallax';
import { useSmoothProgress } from '../hooks/useSmoothProgress';
import { CounterDirectory } from './CounterDirectory';
import { HallCta } from './HallCta';
import { ParallaxMotion } from './ParallaxMotion';
import { SectionScrollSeam } from './SectionScrollSeam';
import { SectionLabel, StudioContainer, StudioHeading } from './StudioShell';

const { vendors } = LANDING_COPY;

export function VendorsSection() {
  const { ref, scrollYProgress } = useSectionParallax(['start end', 'end start']);
  const smooth = useSmoothProgress(scrollYProgress, PARALLAX_SPRING.ambient);
  const headerY = useTransform(smooth, [0, 0.45, 1], ['6%', '-2%', '-8%']);
  const titleY = useTransform(smooth, [0, 1], ['3%', '-6%']);
  const accentX = useTransform(smooth, [0, 1], ['0%', '-4%']);
  const ledeY = useTransform(smooth, [0, 1], ['2%', '-5%']);
  const glowOpacity = useTransform(smooth, [0, 0.4, 1], [0, 0.42, 0.18]);
  const glowY = useTransform(smooth, [0, 1], ['-12%', '16%']);
  const glowBackY = useTransform(smooth, [0, 1], ['8%', '-14%']);
  const watermarkX = useTransform(smooth, [0, 1], ['-4%', '6%']);
  const meshY = useTransform(smooth, [0, 1], ['-6%', '10%']);
  const meshX = useTransform(smooth, [0, 1], ['-4%', '5%']);
  const meshOpacity = useTransform(smooth, [0, 0.35, 1], [0, 0.22, 0.1]);
  const meshRotate = useTransform(smooth, [0, 1], ['-0.8deg', '0.6deg']);

  return (
    <section id="landing-vendors" ref={ref} className="landing-vendors landing-vendors--hall grain-overlay landing-parallax-scene">
      <SectionScrollSeam targetRef={ref} variant="dark" />
      <ParallaxMotion
        modes={['shift-y', 'fade']}
        y={glowBackY}
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
        modes={['shift-x']}
        x={watermarkX}
        className="landing-vendors__watermark font-display"
        aria-hidden
      >
        {vendors.label}
      </ParallaxMotion>

      <StudioContainer>
        <ParallaxMotion modes={['shift-y']} y={headerY}>
          <motion.div
            initial="initial"
            whileInView="animate"
            viewport={{ once: true, margin: '-60px' }}
            variants={SLIDE_UP_VARIANTS}
            className="landing-vendors__header landing-vendors__header--simple"
          >
            <div>
              <SectionLabel label={vendors.label} dark />
              <ParallaxMotion modes={['shift-y']} y={titleY}>
              <StudioHeading size="display" className="landing-vendors__title">
                {vendors.headline[0]}
                <ParallaxMotion modes={['shift-x']} x={accentX} as="span" className="landing-heading__accent-light">
                  {vendors.headline[1]}
                </ParallaxMotion>
              </StudioHeading>
              </ParallaxMotion>
              <ParallaxMotion modes={['shift-y']} y={ledeY}>
              <p className="landing-vendors__lede landing-vendors__lede--inline">{vendors.lede}</p>
              </ParallaxMotion>
            </div>
            <HallCta
              href={vendors.cta.href}
              label={vendors.cta.label}
              variant="primary"
              dark
              className="landing-vendors__cta"
              icon={<ArrowRight className="h-4 w-4" />}
            />
          </motion.div>
        </ParallaxMotion>

        <CounterDirectory progress={smooth} />
      </StudioContainer>

      <SectionScrollSeam targetRef={ref} variant="dark" className="landing-section-seam--exit" />
    </section>
  );
}
