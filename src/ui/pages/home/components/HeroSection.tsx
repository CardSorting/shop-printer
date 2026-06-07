'use client';

import Image from 'next/image';
import type { MouseEvent } from 'react';
import {
  motion,
  useReducedMotion,
  useTransform,
  type Transition,
  type Variants,
} from 'framer-motion';
import { ArrowRight, ChevronDown } from 'lucide-react';
import { LANDING_COPY, LANDING_SEO_HEADLINE } from '../copy';

const HERO_FOOD_SPREAD_IMAGE = '/images/landing/hero-food-spread.png';
import { useHallDaypart } from '../hooks/useHallDaypart';
import { PARALLAX_SPRING, useHeroParallax, useScrollVelocityBlur, useScrollVelocityScale } from '../hooks/useParallax';
import { useElementPointerParallax } from '../hooks/usePointerParallax';
import { useSmoothProgress } from '../hooks/useSmoothProgress';
import { scrollToLandingSection } from '../hooks/useLandingSectionNav';
import { HallCta } from './HallCta';
import { CARD_LIFT_SUBTLE, CARD_TAP } from './MicroMotion';
import { HallInfoRibbon } from './HallInfoRibbon';
import { ParallaxMotion } from './ParallaxMotion';
import { StudioContainer } from './StudioShell';
import { formatHoursRange } from '../utils/hallTime';
import { SITE_HOURS_CLOSES, SITE_HOURS_OPENS } from '@utils/seo';

const { hero } = LANDING_COPY;

/** Snappy hero springs — low mass, high stiffness for a quick settle */
const SNAP: Transition = { type: 'spring', stiffness: 620, damping: 38, mass: 0.58 };
const SNAP_SOFT: Transition = { type: 'spring', stiffness: 500, damping: 34, mass: 0.62 };
const MEDIA_SNAP: Transition = { type: 'spring', stiffness: 220, damping: 30, mass: 0.75 };

const HERO_CARD_VARIANTS: Variants = {
  hidden: { opacity: 0, y: 14 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      ...SNAP,
      staggerChildren: 0.026,
      delayChildren: 0,
    },
  },
};

const HERO_ITEM_VARIANTS: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: SNAP_SOFT },
};

const HERO_HEADLINE_CONTAINER: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.02 },
  },
};

const HERO_LINE_VARIANTS: Variants = {
  hidden: { opacity: 0, y: '108%' },
  visible: {
    opacity: 1,
    y: 0,
    transition: SNAP,
  },
};

const HERO_RULE_VARIANTS: Variants = {
  hidden: { scaleX: 0, opacity: 0 },
  visible: { scaleX: 1, opacity: 1, transition: { ...SNAP, stiffness: 540 } },
};

function handleHashNav(event: MouseEvent<HTMLAnchorElement>, href: string) {
  if (!href.startsWith('#')) return;
  event.preventDefault();
  scrollToLandingSection(href.slice(1));
}

export function HeroSection() {
  const reduceMotion = useReducedMotion();
  const { daypart, isOpen } = useHallDaypart();
  const daypartHero = hero.byDaypart[daypart];
  const { ref, scrollYProgress } = useHeroParallax();
  const smooth = useSmoothProgress(scrollYProgress, PARALLAX_SPRING.hero);
  const pointer = useElementPointerParallax(ref, { strength: 4.5, stiffness: 88, damping: 15 });
  const velocityScale = useScrollVelocityScale(smooth, [1, 1.022]);
  const velocityBlur = useScrollVelocityBlur(smooth, 2.5);

  const mediaY = useTransform(smooth, [0, 0.35, 1], ['0%', '10%', '26%']);
  const mediaX = useTransform(smooth, [0, 0.5, 1], ['0%', '-1.5%', '-5%']);
  const mediaScale = useTransform(smooth, [0, 0.45, 1], [1, 1.06, 1.14]);
  const mediaFilter = useTransform(
    smooth,
    [0, 0.55, 1],
    ['brightness(1) saturate(1)', 'brightness(0.95) saturate(0.99)', 'brightness(0.8) saturate(0.93)'],
  );
  const vignetteOpacity = useTransform(smooth, [0, 0.6, 1], [0.35, 0.55, 0.85]);
  const vignetteY = useTransform(smooth, [0, 1], ['0%', '16%']);
  const gradientY = useTransform(smooth, [0, 1], ['0%', '24%']);
  const gradientOpacity = useTransform(smooth, [0, 0.5, 1], [0.78, 0.9, 1]);
  const hazeY = useTransform(smooth, [0, 1], ['-3%', '18%']);
  const hazeOpacity = useTransform(smooth, [0, 0.35, 1], [0.28, 0.16, 0.42]);
  const orbBackY = useTransform(smooth, [0, 1], ['-5%', '20%']);
  const orbFrontY = useTransform(smooth, [0, 1], ['2%', '-12%']);
  const orbBackOpacity = useTransform(smooth, [0, 0.45, 1], [0.48, 0.3, 0.08]);
  const cinemaFadeOpacity = useTransform(smooth, [0, 0.35, 0.72], [0.25, 0.65, 1]);
  const contentY = useTransform(smooth, [0, 1], ['0%', '-20%']);
  const contentOpacity = useTransform(smooth, [0, 0.4, 0.85], [1, 0.94, 0.72]);
  const cardScale = useTransform(smooth, [0, 0.55], [1, 0.965]);
  const pillY = useTransform(smooth, [0, 1], ['0%', '-32%']);
  const scrollCueOpacity = useTransform(smooth, [0, 0.2, 0.4], [1, 0.75, 0]);
  const scrollCueY = useTransform(smooth, [0, 0.4], ['0%', '1.5rem']);
  const watermarkY = useTransform(smooth, [0, 1], ['0%', '24%']);
  const watermarkX = useTransform(smooth, [0, 1], ['0%', '-10%']);
  const watermarkOpacity = useTransform(smooth, [0, 0.32, 0.72, 1], [0.055, 0.04, 0.022, 0.01]);
  const watermarkScale = useTransform(smooth, [0, 0.5, 1], [1, 1.08, 1.16]);

  const hoursLabel = formatHoursRange(SITE_HOURS_OPENS ?? '11:00', SITE_HOURS_CLOSES ?? '22:00');
  const openLabel =
    isOpen === null ? 'Checking hours…' : isOpen ? hero.ribbon.statusOpen : hero.ribbon.statusClosed;

  const cardMotion = reduceMotion
    ? { initial: false as const, animate: undefined, variants: undefined }
    : { initial: 'hidden' as const, animate: 'visible' as const, variants: HERO_CARD_VARIANTS };

  const itemVariants = reduceMotion ? undefined : HERO_ITEM_VARIANTS;
  const lineVariants = reduceMotion ? undefined : HERO_LINE_VARIANTS;
  const headlineContainerVariants = reduceMotion ? undefined : HERO_HEADLINE_CONTAINER;

  return (
    <section
      id="landing-hero"
      ref={ref}
      className="landing-hero landing-hero--hall landing-hero--simple landing-hero--cinematic grain-overlay landing-parallax-scene"
    >
      <motion.div
        className="landing-hero__media-reveal"
        initial={reduceMotion ? false : { opacity: 0, scale: 1.02 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={reduceMotion ? { duration: 0 } : MEDIA_SNAP}
      >
        <ParallaxMotion
          modes={['transform', 'filter']}
          x={mediaX}
          y={mediaY}
          scale={mediaScale}
          filter={mediaFilter}
          className="landing-hero__media"
          aria-hidden
        >
          <ParallaxMotion
            modes={['transform', 'filter']}
            x={pointer.x}
            y={pointer.y}
            scale={velocityScale}
            filter={velocityBlur}
            className="landing-hero__media-inner"
          >
            <Image
              src={HERO_FOOD_SPREAD_IMAGE}
              alt=""
              fill
              priority
              sizes="100vw"
              className="object-cover"
            />
          </ParallaxMotion>
          <ParallaxMotion
            modes={['shift-y', 'fade']}
            y={gradientY}
            opacity={gradientOpacity}
            className="landing-hero__media-gradient"
            aria-hidden
          />
          <ParallaxMotion
            modes={['shift-y', 'fade']}
            y={vignetteY}
            opacity={vignetteOpacity}
            className="landing-hero__media-vignette"
          />
        </ParallaxMotion>
      </motion.div>

      <ParallaxMotion modes={['shift-y', 'fade']} y={hazeY} opacity={hazeOpacity} className="landing-hero__depth-haze" aria-hidden />
      <ParallaxMotion modes={['shift-y', 'fade']} y={orbBackY} opacity={orbBackOpacity} className="landing-hero__depth-orb landing-hero__depth-orb--back" aria-hidden />
      <ParallaxMotion modes={['shift-y']} y={orbFrontY} className="landing-hero__depth-orb landing-hero__depth-orb--front" aria-hidden />

      <ParallaxMotion
        modes={['transform', 'fade']}
        x={watermarkX}
        y={watermarkY}
        scale={watermarkScale}
        opacity={watermarkOpacity}
        className="landing-hero__watermark font-display"
        aria-hidden
      >
        01
      </ParallaxMotion>

      <span className="landing-hero__cinema-rail landing-hero__cinema-rail--head" aria-hidden />
      <ParallaxMotion modes={['fade']} opacity={cinemaFadeOpacity} className="landing-hero__cinema-fade" aria-hidden />
      <span className="landing-hero__cinema-rail landing-hero__cinema-rail--foot" aria-hidden />

      <ParallaxMotion modes={['shift-y']} y={pillY}>
        <motion.p
          className="landing-hero__location-pill"
          aria-label="Location"
          initial={reduceMotion ? false : { opacity: 0, x: 8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={reduceMotion ? { duration: 0 } : { ...SNAP_SOFT, delay: 0.12 }}
          {...(reduceMotion ? {} : { whileHover: { y: -2, scale: 1.03, transition: SNAP_SOFT }, whileTap: CARD_TAP })}
        >
          {hero.coords}
        </motion.p>
      </ParallaxMotion>

      <StudioContainer className="landing-hero__content landing-hero__content--simple">
        <ParallaxMotion modes={['transform', 'fade']} y={contentY} opacity={contentOpacity} scale={cardScale}>
          <motion.article
            className="landing-hero__card hall-glass"
            {...cardMotion}
            {...(reduceMotion ? {} : { whileHover: CARD_LIFT_SUBTLE, whileTap: CARD_TAP })}
            aria-label="Welcome to WoodBine"
          >
            <span className="landing-hero__card-glow" aria-hidden />
            <motion.span className="landing-hero__card-accent" aria-hidden variants={HERO_RULE_VARIANTS} />

            <motion.div className="landing-hero__mobile-meta" variants={itemVariants} aria-live="polite">
              <span
                className={`landing-hero__mobile-dot${isOpen === true ? ' landing-hero__mobile-dot--open' : isOpen === false ? ' landing-hero__mobile-dot--closed' : ''}`}
                aria-hidden
              />
              <span className="landing-hero__mobile-status">{openLabel}</span>
              <span className="landing-hero__mobile-sep" aria-hidden>·</span>
              <span className="landing-hero__mobile-hours">{hoursLabel}</span>
            </motion.div>

            <motion.div variants={itemVariants}>
              <HallInfoRibbon hoursLabel={hoursLabel} vibe={LANDING_COPY.daypart[daypart].greeting} />
            </motion.div>

            <motion.p className="landing-hero__kicker" variants={itemVariants}>
              {hero.kicker}
            </motion.p>

            <motion.div className="landing-hero__headline-lockup" variants={headlineContainerVariants}>
              <h1
                data-seo-speakable
                className="landing-heading landing-heading--hero"
                aria-label={LANDING_SEO_HEADLINE}
              >
                <span className="sr-only">{LANDING_SEO_HEADLINE}</span>
                <span className="landing-hero__headline-line">
                  <motion.span className="landing-hero__line font-display" variants={lineVariants}>
                    {hero.headline[0]}
                  </motion.span>
                </span>
                <span className="landing-hero__headline-line">
                  <motion.span
                    className="landing-hero__line font-display landing-heading__accent-light"
                    variants={lineVariants}
                  >
                    {hero.headline[1]}
                  </motion.span>
                </span>
              </h1>
            </motion.div>

            <motion.div className="landing-hero__rule" variants={HERO_RULE_VARIANTS} />

            <motion.p className="landing-hero__lede" variants={itemVariants}>
              {daypartHero.lede}
            </motion.p>

            <motion.p className="landing-hero__tagline" variants={itemVariants}>
              {daypartHero.aside}
            </motion.p>

            <motion.div className="landing-hero__actions" variants={itemVariants}>
              <HallCta
                href={hero.cta.primary.href}
                label={hero.cta.primary.label}
                icon={<ArrowRight className="h-4 w-4" />}
                onClick={(event) => handleHashNav(event, hero.cta.primary.href)}
              />
              <HallCta href={hero.cta.secondary.href} label={hero.cta.secondary.label} variant="ghost" />
            </motion.div>
          </motion.article>
        </ParallaxMotion>
      </StudioContainer>

      <ParallaxMotion modes={['shift-y', 'fade']} y={scrollCueY} opacity={scrollCueOpacity}>
        <motion.a
          href="#landing-vendors"
          className="landing-hero__scroll-cue"
          initial={reduceMotion ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={reduceMotion ? { duration: 0 } : { ...SNAP_SOFT, delay: 0.28 }}
          {...(reduceMotion
            ? {}
            : {
                whileHover: { y: -2, scale: 1.02, transition: SNAP_SOFT },
                whileTap: { scale: 0.98, transition: { duration: 0.1 } },
              })}
          onClick={(event) => {
            event.preventDefault();
            scrollToLandingSection('landing-vendors');
          }}
        >
          <span className="landing-hero__scroll-cue-icon" aria-hidden>
            <span className="landing-hero__scroll-line" />
            <motion.span
              animate={reduceMotion ? undefined : { y: [0, 5, 0] }}
              transition={reduceMotion ? undefined : { duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
              className="landing-hero__scroll-chevron-wrap"
            >
              <ChevronDown className="landing-hero__scroll-chevron" />
            </motion.span>
          </span>
          <span>{hero.scroll}</span>
        </motion.a>
      </ParallaxMotion>
    </section>
  );
}
