'use client';

import Image from 'next/image';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { DEFAULT_BLOG_IMAGE, DEFAULT_FOOD_HALL_IMAGE } from '@utils/imageFallback';
import { LANDING_COPY, LANDING_SEO_HEADLINE } from '../copy';
import {
  useHeroParallax,
  useParallaxOpacity,
  useParallaxRotate,
  useParallaxScale,
  useParallaxX,
  useParallaxY,
} from '../hooks/useParallax';
import {
  AgencyBrief,
  AgencyCta,
  AgencyFrame,
  AgencyGrid,
  AgencyStamp,
  SectionWatermark,
  SplitReveal,
  useSmoothProgress,
} from './AgencyChrome';
import { ParallaxLayer } from './ParallaxLayer';
import { ParallaxMotion } from './ParallaxMotion';
import { StudioContainer } from './StudioShell';

const EASE = [0.12, 1, 0.28, 1] as const;
const { hero } = LANDING_COPY;

export function HeroSection() {
  const { ref, scrollYProgress } = useHeroParallax();
  const smooth = useSmoothProgress(scrollYProgress);

  const bgY = useParallaxY(smooth, [0, 40]);
  const bgScale = useParallaxScale(smooth, [1.14, 1.32]);
  const midY = useParallaxY(smooth, [0, 52]);
  const midOpacity = useParallaxOpacity(smooth, [0.4, 0], [0, 0.65]);
  const hazeScale = useParallaxScale(smooth, [1, 1.5], [0, 1]);
  const lightY = useParallaxY(smooth, [0, -20]);
  const contentY = useParallaxY(smooth, [0, -26]);
  const contentOpacity = useParallaxOpacity(smooth, [1, 0], [0, 0.65]);
  const watermarkX = useParallaxX(smooth, [0, -22]);
  const watermarkY = useParallaxY(smooth, [0, 14]);
  const watermarkRotate = useParallaxRotate(smooth, [-3, 4]);
  const gridX = useParallaxX(smooth, [-4, 4]);
  const gridY = useParallaxY(smooth, [3, -3]);
  const gridRotate = useParallaxRotate(smooth, [-0.5, 0.5]);
  const collageY = useParallaxY(smooth, [0, -42]);
  const collageRotate = useParallaxRotate(smooth, [-5, 6]);
  const stampOpacity = useParallaxOpacity(smooth, [1, 0], [0, 0.4]);
  const wmIndexY = useParallaxY(smooth, [8, -8]);

  return (
    <section id="landing-hero" ref={ref} className="landing-hero landing-hero--agency landing-hero--iv grain-overlay">
      <SectionWatermark index="00" parallaxY={wmIndexY} dark />

      <ParallaxMotion className="landing-hero__media" modes={['transform']} y={bgY} scale={bgScale}>
        <Image
          src={DEFAULT_FOOD_HALL_IMAGE}
          alt="WoodBine food hall in a restored Salt Lake warehouse"
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        <div className="landing-hero__media-gradient" />
        <div className="landing-hero__media-vignette" />
      </ParallaxMotion>

      <ParallaxMotion
        className="landing-hero__haze"
        modes={['transform', 'fade']}
        y={midY}
        scale={hazeScale}
        opacity={midOpacity}
      >
        <Image src={DEFAULT_BLOG_IMAGE} alt="" fill sizes="100vw" className="object-cover" aria-hidden />
        <div className="landing-hero__haze-mask" />
      </ParallaxMotion>

      <ParallaxMotion className="landing-hero__light-leak" modes={['shift-y']} y={lightY} aria-hidden />

      <AgencyGrid parallaxX={gridX} parallaxY={gridY} rotate={gridRotate} className="landing-hero__grid-overlay" />

      <ParallaxMotion
        className="landing-hero__watermark font-display"
        modes={['transform']}
        x={watermarkX}
        y={watermarkY}
        rotate={watermarkRotate}
        aria-hidden
      >
        WoodBine
      </ParallaxMotion>

      <ParallaxMotion className="landing-hero__stamp-wrap" modes={['fade']} opacity={stampOpacity}>
        <AgencyStamp coords={hero.coords} dark />
      </ParallaxMotion>

      <ParallaxMotion className="landing-hero__content" modes={['shift-y', 'fade']} y={contentY} opacity={contentOpacity}>
        <StudioContainer>
          <AgencyBrief
            caseStudy={hero.brief.case}
            place={hero.brief.location}
            discipline={hero.brief.discipline}
            year={hero.brief.year}
          />

          <div className="landing-hero__grid">
            <div className="landing-hero__copy">
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.9, delay: 0.08, ease: EASE }}
                className="landing-hero__kicker"
              >
                {hero.kicker}
              </motion.p>

              <h1
                data-seo-speakable
                className="landing-heading landing-heading--hero"
                aria-label={LANDING_SEO_HEADLINE}
              >
                <span className="sr-only">{LANDING_SEO_HEADLINE}</span>
                <span className="landing-hero__line">
                  <SplitReveal delay={0.18}>{hero.headline[0]}</SplitReveal>
                </span>
                <span className="landing-hero__line">
                  <SplitReveal delay={0.3} accent>
                    {hero.headline[1]}
                  </SplitReveal>
                </span>
              </h1>

              <motion.div
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 1.25, delay: 0.52, ease: EASE }}
                className="landing-hero__rule"
              />

              <motion.p
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.9, delay: 0.58, ease: EASE }}
                className="landing-hero__lede"
              >
                {hero.lede}
              </motion.p>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.9, delay: 0.7 }}
                className="landing-hero__tagline"
              >
                {hero.aside}
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.9, delay: 0.82, ease: EASE }}
                className="landing-hero__actions"
              >
                <AgencyCta
                  href={hero.cta.primary.href}
                  label={hero.cta.primary.label}
                  variant="magnetic"
                  index="01"
                  icon={<ArrowRight className="h-4 w-4" />}
                />
                <AgencyCta
                  href={hero.cta.secondary.href}
                  label={hero.cta.secondary.label}
                  variant="ghost"
                  index="02"
                />
              </motion.div>
            </div>

            <motion.div
              initial={{ opacity: 0, x: 72 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 1.25, delay: 0.36, ease: EASE }}
            >
              <ParallaxMotion
                className="landing-hero__collage landing-hero__collage--perspective"
                modes={['transform']}
                y={collageY}
                rotate={collageRotate}
              >
                <AgencyFrame className="landing-hero__collage-frame">
                  <ParallaxLayer progress={smooth} y={[-8, 14]} className="landing-hero__collage-inner">
                    <ParallaxLayer
                      progress={smooth}
                      y={[-12, 8]}
                      className="landing-hero__photo landing-hero__photo--back float-gentle"
                    >
                      <Image
                        src={DEFAULT_BLOG_IMAGE}
                        fill
                        sizes="(max-width: 1024px) 40vw, 280px"
                        className="object-cover"
                        alt="Vendors and seating inside the WoodBine warehouse"
                      />
                    </ParallaxLayer>
                    <ParallaxLayer
                      progress={smooth}
                      y={[6, -12]}
                      className="landing-hero__photo landing-hero__photo--front"
                    >
                      <Image
                        src={DEFAULT_FOOD_HALL_IMAGE}
                        fill
                        sizes="(max-width: 1024px) 55vw, 360px"
                        className="object-cover"
                        alt="Food and drinks at WoodBine food hall"
                      />
                      <div className="landing-hero__photo-caption">
                        <p className="landing-hero__photo-label">{hero.collage.volume}</p>
                        <p className="landing-hero__photo-quote font-display">
                          &ldquo;{hero.collage.quote}&rdquo;
                        </p>
                      </div>
                    </ParallaxLayer>
                  </ParallaxLayer>
                </AgencyFrame>
              </ParallaxMotion>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.35, duration: 0.8 }}
            className="landing-hero__scroll"
          >
            <span>{hero.scroll}</span>
            <span className="landing-hero__scroll-line" />
          </motion.div>
        </StudioContainer>
      </ParallaxMotion>
    </section>
  );
}
