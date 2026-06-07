'use client';

import Image from 'next/image';
import { motion, useTransform } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { DEFAULT_FOOD_HALL_IMAGE } from '@utils/imageFallback';
import { LANDING_COPY, LANDING_SEO_HEADLINE } from '../copy';
import { useHallDaypart } from '../hooks/useHallDaypart';
import { PARALLAX_SPRING, useHeroParallax, useParallaxTilt, useScrollVelocityBlur, useScrollVelocityScale } from '../hooks/useParallax';
import { useElementPointerParallax } from '../hooks/usePointerParallax';
import { useSmoothProgress } from '../hooks/useSmoothProgress';
import { scrollToLandingSection } from '../hooks/useLandingSectionNav';
import { HallCta } from './HallCta';
import { HallInfoRibbon } from './HallInfoRibbon';
import { ParallaxMotion } from './ParallaxMotion';
import { StudioContainer } from './StudioShell';
import { formatHoursRange } from '../utils/hallTime';
import { SITE_HOURS_CLOSES, SITE_HOURS_OPENS } from '@utils/seo';

const { hero } = LANDING_COPY;

const LINE_VARIANTS = {
  initial: { opacity: 0, y: 28, filter: 'blur(6px)' },
  animate: (i: number) => ({
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { duration: 0.85, delay: 0.15 + i * 0.12, ease: [0.16, 1, 0.3, 1] as const },
  }),
};

export function HeroSection() {
  const { daypart } = useHallDaypart();
  const daypartHero = hero.byDaypart[daypart];
  const { ref, scrollYProgress } = useHeroParallax();
  const smooth = useSmoothProgress(scrollYProgress, PARALLAX_SPRING.hero);
  const pointer = useElementPointerParallax(ref, { strength: 5.5, stiffness: 40, damping: 21 });
  const velocityBlur = useScrollVelocityBlur(smooth, 2.5);
  const velocityScale = useScrollVelocityScale(smooth, [1, 1.035]);

  const mediaY = useTransform(smooth, [0, 0.35, 1], ['0%', '14%', '34%']);
  const mediaX = useTransform(smooth, [0, 0.5, 1], ['0%', '-3%', '-8%']);
  const mediaScale = useTransform(smooth, [0, 0.45, 1], [1, 1.1, 1.24]);
  const mediaRotate = useTransform(smooth, [0, 1], ['0deg', '1.5deg']);
  const mediaFilter = useTransform(
    smooth,
    [0, 0.55, 1],
    ['brightness(1) saturate(1)', 'brightness(0.92) saturate(0.98)', 'brightness(0.72) saturate(0.9)'],
  );
  const vignetteOpacity = useTransform(smooth, [0, 0.6, 1], [0.35, 0.55, 0.82]);
  const vignetteY = useTransform(smooth, [0, 1], ['0%', '18%']);
  const orbBackY = useTransform(smooth, [0, 1], ['-6%', '22%']);
  const orbFrontY = useTransform(smooth, [0, 1], ['2%', '-14%']);
  const orbBackOpacity = useTransform(smooth, [0, 0.5, 1], [0.55, 0.35, 0.12]);

  const contentY = useTransform(smooth, [0, 1], ['0%', '-22%']);
  const contentOpacity = useTransform(smooth, [0, 0.5, 1], [1, 0.88, 0.62]);
  const contentTiltX = useParallaxTilt(smooth, 'x', [0, -2.5]);
  const pillY = useTransform(smooth, [0, 1], ['0%', '-48%']);
  const scrollCueOpacity = useTransform(smooth, [0, 0.25, 0.5], [1, 0.65, 0]);
  const scrollCueY = useTransform(smooth, [0, 0.5], ['0%', '2.5rem']);
  const lineOneY = useTransform(smooth, [0, 1], ['0%', '-8%']);
  const lineTwoY = useTransform(smooth, [0, 1], ['0%', '-14%']);
  const hazeY = useTransform(smooth, [0, 1], ['-4%', '20%']);
  const hazeOpacity = useTransform(smooth, [0, 0.4, 1], [0.25, 0.15, 0.45]);
  const gradientY = useTransform(smooth, [0, 1], ['0%', '28%']);
  const gradientOpacity = useTransform(smooth, [0, 0.55, 1], [0.72, 0.88, 1]);
  const ribbonY = useTransform(smooth, [0, 1], ['0%', '-14%']);
  const ledeY = useTransform(smooth, [0, 1], ['0%', '-11%']);
  const taglineY = useTransform(smooth, [0, 1], ['0%', '-9%']);
  const actionsY = useTransform(smooth, [0, 1], ['0%', '-16%']);
  const ruleScale = useTransform(smooth, [0, 0.35], [1, 0.82]);

  return (
    <section
      id="landing-hero"
      ref={ref}
      className="landing-hero landing-hero--hall landing-hero--simple grain-overlay landing-parallax-scene"
    >
      <ParallaxMotion
        modes={['transform', 'filter']}
        x={mediaX}
        y={mediaY}
        scale={mediaScale}
        rotate={mediaRotate}
        filter={mediaFilter}
        className="landing-hero__media"
        aria-hidden
      >
        <ParallaxMotion modes={['transform', 'filter']} x={pointer.x} y={pointer.y} scale={velocityScale} filter={velocityBlur} className="landing-hero__media-inner">
          <Image
            src={DEFAULT_FOOD_HALL_IMAGE}
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
        </ParallaxMotion>
        <ParallaxMotion modes={['shift-y', 'fade']} y={gradientY} opacity={gradientOpacity} className="landing-hero__media-gradient" aria-hidden />
        <ParallaxMotion modes={['shift-y', 'fade']} y={vignetteY} opacity={vignetteOpacity} className="landing-hero__media-vignette" />
      </ParallaxMotion>

      <ParallaxMotion modes={['shift-y', 'fade']} y={hazeY} opacity={hazeOpacity} className="landing-hero__depth-haze" aria-hidden />

      <ParallaxMotion modes={['shift-y', 'fade']} y={orbBackY} opacity={orbBackOpacity} className="landing-hero__depth-orb landing-hero__depth-orb--back" aria-hidden />
      <ParallaxMotion modes={['shift-y']} y={orbFrontY} className="landing-hero__depth-orb landing-hero__depth-orb--front" aria-hidden />

      <ParallaxMotion modes={['shift-y']} y={pillY}>
        <p className="landing-hero__location-pill" aria-label="Location">
          {hero.coords}
        </p>
      </ParallaxMotion>

      <StudioContainer className="landing-hero__content landing-hero__content--simple">
        <ParallaxMotion modes={['transform', 'fade']} y={contentY} opacity={contentOpacity} rotateX={contentTiltX}>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
          >
            <ParallaxMotion modes={['shift-y']} y={ribbonY}>
              <HallInfoRibbon
                hoursLabel={formatHoursRange(SITE_HOURS_OPENS ?? '11:00', SITE_HOURS_CLOSES ?? '22:00')}
                vibe={LANDING_COPY.daypart[daypart].greeting}
              />
            </ParallaxMotion>
          </motion.div>

          <div className="landing-hero__copy landing-hero__copy--simple">
            <motion.p
              className="landing-hero__kicker"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
            >
              {hero.kicker}
            </motion.p>

            <h1
              data-seo-speakable
              className="landing-heading landing-heading--hero"
              aria-label={LANDING_SEO_HEADLINE}
            >
              <span className="sr-only">{LANDING_SEO_HEADLINE}</span>
              <motion.span
                custom={0}
                variants={LINE_VARIANTS}
                initial="initial"
                animate="animate"
                className="landing-hero__line font-display"
              >
                <ParallaxMotion modes={['shift-y']} y={lineOneY} as="span">
                  {hero.headline[0]}
                </ParallaxMotion>
              </motion.span>
              <motion.span
                custom={1}
                variants={LINE_VARIANTS}
                initial="initial"
                animate="animate"
                className="landing-hero__line font-display landing-heading__accent-light"
              >
                <ParallaxMotion modes={['shift-y']} y={lineTwoY} as="span">
                  {hero.headline[1]}
                </ParallaxMotion>
              </motion.span>
            </h1>

            <ParallaxMotion modes={['scale-x']} scaleX={ruleScale}>
            <motion.div
              className="landing-hero__rule"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.8, delay: 0.45, ease: [0.16, 1, 0.3, 1] }}
            />
            </ParallaxMotion>

            <ParallaxMotion modes={['shift-y']} y={ledeY}>
            <motion.p
              className="landing-hero__lede"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
            >
              {daypartHero.lede}
            </motion.p>
            </ParallaxMotion>
            <ParallaxMotion modes={['shift-y']} y={taglineY}>
            <motion.p
              className="landing-hero__tagline"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.58, ease: [0.16, 1, 0.3, 1] }}
            >
              {daypartHero.aside}
            </motion.p>
            </ParallaxMotion>

            <ParallaxMotion modes={['shift-y']} y={actionsY}>
            <motion.div
              className="landing-hero__actions"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.66, ease: [0.16, 1, 0.3, 1] }}
            >
              <HallCta
                href={hero.cta.primary.href}
                label={hero.cta.primary.label}
                icon={<ArrowRight className="h-4 w-4" />}
              />
              <HallCta href={hero.cta.secondary.href} label={hero.cta.secondary.label} variant="ghost" />
            </motion.div>
            </ParallaxMotion>
          </div>
        </ParallaxMotion>
      </StudioContainer>

      <ParallaxMotion modes={['shift-y', 'fade']} y={scrollCueY} opacity={scrollCueOpacity}>
        <a
          href="#landing-vendors"
          className="landing-hero__scroll-cue"
          onClick={(e) => {
            e.preventDefault();
            scrollToLandingSection('landing-vendors');
          }}
        >
          <span className="landing-hero__scroll-line" aria-hidden />
          <span>{hero.scroll}</span>
        </a>
      </ParallaxMotion>
    </section>
  );
}
