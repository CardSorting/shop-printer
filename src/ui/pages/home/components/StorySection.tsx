'use client';

import Image from 'next/image';
import { motion } from 'framer-motion';
import { SLIDE_UP_VARIANTS, STAGGER_CONTAINER_VARIANTS } from '@ui/animations';
import { DEFAULT_FOOD_HALL_IMAGE } from '@utils/imageFallback';
import { LANDING_COPY } from '../copy';
import { useSectionParallax, useParallaxY, useParallaxX, useParallaxScale } from '../hooks/useParallax';
import { AgencyFrame, AgencyGrid, AgencyRail, SectionWatermark, useSmoothProgress } from './AgencyChrome';
import { ParallaxLayer } from './ParallaxLayer';
import { ParallaxMotion } from './ParallaxMotion';
import { SectionLabel, StudioContainer, StudioHeading } from './StudioShell';

const { story } = LANDING_COPY;

export function StorySection() {
  const { ref, scrollYProgress } = useSectionParallax(['start end', 'end start']);
  const smooth = useSmoothProgress(scrollYProgress);
  const introX = useParallaxX(smooth, [6, -6]);
  const railY = useParallaxY(smooth, [5, -5]);
  const figureY = useParallaxY(smooth, [20, -20]);
  const figureScale = useParallaxScale(smooth, [1.1, 0.94], [0.1, 0.88]);
  const gridX = useParallaxX(smooth, [-3, 3]);
  const wmY = useParallaxY(smooth, [10, -10]);

  return (
    <section id="landing-story" ref={ref} className="landing-story landing-story--agency landing-story--iv">
      <SectionWatermark index={story.index} parallaxY={wmY} />
      <AgencyGrid parallaxX={gridX} className="landing-story__grid-overlay" />
      <AgencyRail text="Theory — Case 01" side="left" parallaxY={railY} />

      <StudioContainer>
        <div className="landing-story__grid">
          <ParallaxMotion modes={['shift-x']} x={introX}>
            <motion.div
              initial="initial"
              whileInView="animate"
              viewport={{ once: true, margin: '-80px' }}
              variants={SLIDE_UP_VARIANTS}
              className="landing-story__intro"
            >
              <SectionLabel index={story.index} label={story.label} />
              <StudioHeading size="display">
                {story.headline[0]}
                <span className="landing-heading__accent">{story.headline[1]}</span>
              </StudioHeading>
              <p className="landing-story__body">{story.body}</p>
              <blockquote className="landing-story__pullquote font-display">{story.pullquote}</blockquote>
            </motion.div>
          </ParallaxMotion>

          <ParallaxMotion modes={['transform']} y={figureY} scale={figureScale} className="landing-story__figure">
            <AgencyFrame>
              <ParallaxLayer progress={smooth} y={[12, -12]} className="landing-story__figure-frame image-frame">
                <Image
                  src={DEFAULT_FOOD_HALL_IMAGE}
                  fill
                  sizes="(max-width: 1024px) 100vw, 45vw"
                  className="object-cover"
                  alt="The open floor of WoodBine food hall"
                />
                <div className="landing-story__figure-overlay" />
              </ParallaxLayer>
            </AgencyFrame>
            <p className="landing-story__figure-caption">{story.figureCaption}</p>
          </ParallaxMotion>

          <motion.div
            initial="initial"
            whileInView="animate"
            viewport={{ once: true, margin: '-60px' }}
            variants={STAGGER_CONTAINER_VARIANTS}
            className="landing-story__pillars"
          >
            {story.pillars.map((pillar) => (
              <motion.article key={pillar.index} variants={SLIDE_UP_VARIANTS} className="landing-story__pillar group">
                <span className="landing-story__pillar-index">{pillar.index}</span>
                <div className="landing-story__pillar-body">
                  <p className="landing-story__pillar-kicker">{pillar.kicker}</p>
                  <h3 className="landing-story__pillar-title font-display">{pillar.title}</h3>
                  <p className="landing-story__pillar-text">{pillar.body}</p>
                </div>
                <span className="landing-story__pillar-line" aria-hidden />
              </motion.article>
            ))}
          </motion.div>
        </div>
      </StudioContainer>
    </section>
  );
}
