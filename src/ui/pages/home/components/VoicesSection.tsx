'use client';

import { motion } from 'framer-motion';
import { SLIDE_UP_VARIANTS } from '@ui/animations';
import { LANDING_COPY } from '../copy';
import { useSectionParallax, useParallaxX, useParallaxY } from '../hooks/useParallax';
import { AgencyRail, SectionWatermark, useSmoothProgress } from './AgencyChrome';
import { ParallaxMotion } from './ParallaxMotion';
import { SectionLabel, StudioContainer, StudioHeading } from './StudioShell';

const { voices } = LANDING_COPY;

export function VoicesSection() {
  const { ref, scrollYProgress } = useSectionParallax();
  const smooth = useSmoothProgress(scrollYProgress);
  const headerX = useParallaxX(smooth, [8, -8]);
  const railY = useParallaxY(smooth, [5, -5]);
  const wmY = useParallaxY(smooth, [6, -6]);

  return (
    <section id="landing-voices" ref={ref} className="landing-voices landing-voices--agency landing-voices--iv">
      <SectionWatermark index={voices.index} parallaxY={wmY} />
      <AgencyRail text="Record — Evidence" side="right" parallaxY={railY} />

      <StudioContainer>
        <ParallaxMotion modes={['shift-x']} x={headerX}>
          <motion.div
            initial="initial"
            whileInView="animate"
            viewport={{ once: true, margin: '-60px' }}
            variants={SLIDE_UP_VARIANTS}
            className="landing-voices__header"
          >
            <SectionLabel index={voices.index} label={voices.label} />
            <StudioHeading size="display">
              {voices.headline[0]}
              <span className="landing-heading__muted">{voices.headline[1]}</span>
            </StudioHeading>
          </motion.div>
        </ParallaxMotion>

        <motion.blockquote
          initial={{ opacity: 0, y: 48 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 1.05, ease: [0.12, 1, 0.28, 1] }}
          className="landing-voices__featured font-display"
        >
          <span className="landing-voices__mark" aria-hidden>&ldquo;</span>
          <p>{voices.featured.quote}</p>
          <footer>— {voices.featured.role}</footer>
        </motion.blockquote>

        <div className="landing-voices__scroll-wrap">
          <div className="landing-voices__scroll-track">
            {voices.cards.map((voice, i) => (
              <motion.blockquote
                key={voice.role}
                initial={{ opacity: 0, y: 32 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-20px' }}
                transition={{ duration: 0.75, delay: i * 0.07, ease: [0.12, 1, 0.28, 1] }}
                className="landing-voices__card"
              >
                <span className="landing-voices__card-index">{String(i + 1).padStart(2, '0')}</span>
                <p className="landing-voices__card-quote font-display">&ldquo;{voice.quote}&rdquo;</p>
                <footer className="landing-voices__card-role">— {voice.role}</footer>
              </motion.blockquote>
            ))}
          </div>
        </div>
      </StudioContainer>
    </section>
  );
}
