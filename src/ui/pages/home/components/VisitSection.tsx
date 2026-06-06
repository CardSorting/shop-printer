'use client';

import Image from 'next/image';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { SLIDE_UP_VARIANTS } from '@ui/animations';
import { DEFAULT_FOOD_HALL_IMAGE } from '@utils/imageFallback';
import { LANDING_COPY } from '../copy';
import { useSectionParallax, useParallaxScale, useParallaxY, useParallaxX } from '../hooks/useParallax';
import { AgencyCta, AgencyGrid, AgencyStamp, SectionWatermark, useSmoothProgress } from './AgencyChrome';
import { ParallaxLayer } from './ParallaxLayer';
import { ParallaxMotion } from './ParallaxMotion';
import { SectionLabel, StudioContainer, StudioHeading } from './StudioShell';

const { visit } = LANDING_COPY;

export function VisitSection() {
  const { ref, scrollYProgress } = useSectionParallax(['start end', 'end start']);
  const smooth = useSmoothProgress(scrollYProgress);
  const bgScale = useParallaxScale(smooth, [1.28, 1], [0, 0.75]);
  const bgY = useParallaxY(smooth, [0, 24]);
  const copyX = useParallaxX(smooth, [-5, 5]);
  const gridX = useParallaxX(smooth, [2, -2]);
  const wmY = useParallaxY(smooth, [8, -8]);

  return (
    <section id="landing-visit" ref={ref} className="landing-visit landing-visit--agency landing-visit--iv grain-overlay">
      <SectionWatermark index={visit.index} dark parallaxY={wmY} />
      <ParallaxMotion modes={['transform']} scale={bgScale} y={bgY} className="landing-visit__media" aria-hidden>
        <Image src={DEFAULT_FOOD_HALL_IMAGE} alt="" fill sizes="100vw" className="object-cover" />
        <div className="landing-visit__scrim" />
      </ParallaxMotion>

      <AgencyGrid parallaxX={gridX} className="landing-visit__grid-overlay" />
      <AgencyStamp coords="40.7608° N" dark className="landing-visit__stamp" />

      <StudioContainer className="landing-visit__inner">
        <div className="landing-visit__grid">
          <ParallaxMotion modes={['shift-x']} x={copyX}>
            <motion.div
              initial="initial"
              whileInView="animate"
              viewport={{ once: true, margin: '-60px' }}
              variants={SLIDE_UP_VARIANTS}
              className="landing-visit__copy"
            >
            <SectionLabel index={visit.index} label={visit.label} dark />
            <StudioHeading size="display" className="landing-visit__title">
              {visit.headline[0]}
              <span className="landing-heading__accent-light">{visit.headline[1]}</span>
            </StudioHeading>
            <p className="landing-visit__lede">{visit.lede}</p>
            <p className="landing-visit__sub">{visit.sub}</p>

            <dl className="landing-visit__stats">
              {visit.stats.map((item) => (
                <div key={item.label}>
                  <dt className="landing-visit__stat-label font-display">{item.label}</dt>
                  <dd className="landing-visit__stat-sub">{item.sub}</dd>
                </div>
              ))}
            </dl>
          </motion.div>
          </ParallaxMotion>

          <ParallaxLayer progress={smooth} y={[14, -14]}>
            <motion.div
              initial={{ opacity: 0, y: 48 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.95, ease: [0.16, 1, 0.3, 1] }}
              className="landing-visit__card"
            >
              <p className="landing-visit__card-kicker">{visit.card.kicker}</p>
              <h3 className="landing-visit__card-title font-display">{visit.card.title}</h3>
              <p className="landing-visit__card-body">{visit.card.body}</p>
              <AgencyCta
                href={visit.card.cta.href}
                label={visit.card.cta.label}
                variant="magnetic"
                className="landing-visit__card-cta"
                index="06"
                icon={<ArrowRight className="h-4 w-4" />}
              />
            </motion.div>
          </ParallaxLayer>
        </div>
      </StudioContainer>
    </section>
  );
}
