'use client';

import dynamic from 'next/dynamic';
import { useRef, type ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion, useScroll, useTransform, type MotionValue } from 'framer-motion';
import { ArrowRight, Clock, MapPin, Phone } from 'lucide-react';
import { SLIDE_UP_VARIANTS, STAGGER_CONTAINER_VARIANTS } from '@ui/animations';
import { DEFAULT_FOOD_HALL_IMAGE } from '@utils/imageFallback';
import { LANDING_COPY } from '../copy';
import { HALL_FOOD_PARALLAX_FRAMES } from '../constants';
import { PARALLAX_SPRING, useStaggeredParallaxY } from '../hooks/useParallax';
import { useSmoothProgress } from '../hooks/useSmoothProgress';
import { HallCta } from './HallCta';
import { ParallaxMotion } from './ParallaxMotion';
import { SectionScrollSeam } from './SectionScrollSeam';
import { SectionLabel, StudioContainer, StudioHeading } from './StudioShell';
import { VisitContinuedBand } from './VisitContinuedBand';
import { formatHoursRange } from '../utils/hallTime';
import {
  SITE_HOURS_CLOSES,
  SITE_HOURS_OPENS,
  SITE_LOCALITY,
  SITE_PHONE,
  SITE_REGION,
  SITE_STREET,
} from '@utils/seo';

const HallBeyondSection = dynamic(
  () => import('./HallBeyondSection').then((m) => ({ default: m.HallBeyondSection })),
  { ssr: true },
);

const HallFoodParallaxBreak = dynamic(
  () => import('./HallFoodParallaxBreak').then((m) => ({ default: m.HallFoodParallaxBreak })),
  { ssr: true },
);

const HallGatherings = dynamic(
  () => import('./HallGatherings').then((m) => ({ default: m.HallGatherings })),
  { ssr: true },
);

const HallGettingHere = dynamic(
  () => import('./HallGettingHere').then((m) => ({ default: m.HallGettingHere })),
  { ssr: true },
);

const { visit } = LANDING_COPY;

const [morningFrame, passFrame, gatherFrame] = HALL_FOOD_PARALLAX_FRAMES;

const STAT_VARIANTS = {
  initial: { opacity: 0, y: 22 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: [0.16, 1, 0.3, 1] as const },
  },
};

function VisitStatParallax({
  progress,
  index,
  children,
}: {
  progress: MotionValue<number>;
  index: number;
  children: ReactNode;
}) {
  const y = useStaggeredParallaxY(progress, index, 3, [2.5, -3.5]);

  return (
    <ParallaxMotion modes={['shift-y']} y={y}>
      {children}
    </ParallaxMotion>
  );
}

export function VisitSection() {
  const visitRef = useRef<HTMLElement>(null);
  const { scrollYProgress: visitProgress } = useScroll({
    target: visitRef,
    offset: ['start end', 'end start'],
  });
  const visitSmooth = useSmoothProgress(visitProgress, PARALLAX_SPRING.ambient);
  const visitMediaY = useTransform(visitSmooth, [0, 1], ['-16%', '16%']);
  const visitMediaX = useTransform(visitSmooth, [0, 1], ['-5%', '5%']);
  const visitMediaScale = useTransform(visitSmooth, [0, 0.5, 1], [1.16, 1.02, 1.12]);
  const visitMediaOpacity = useTransform(visitSmooth, [0, 0.35, 0.65, 1], [0.14, 0.26, 0.22, 0.1]);
  const mediaInnerY = useTransform(visitSmooth, [0, 1], ['-8%', '12%']);
  const mediaInnerScale = useTransform(visitSmooth, [0, 0.45, 1], [1.08, 1, 1.06]);
  const scrimY = useTransform(visitSmooth, [0, 1], ['4%', '-6%']);
  const scrimOpacity = useTransform(visitSmooth, [0, 0.5, 1], [0.88, 0.92, 0.96]);
  const ambientY = useTransform(visitSmooth, [0, 1], ['-10%', '14%']);
  const ambientOpacity = useTransform(visitSmooth, [0, 0.4, 1], [0, 0.32, 0.14]);
  const cardX = useTransform(visitSmooth, [0, 1], ['5%', '-6%']);
  const cardY = useTransform(visitSmooth, [0, 1], ['7%', '-8%']);
  const cardRotateY = useTransform(visitSmooth, [0, 1], ['-2.5deg', '2.5deg']);
  const copyY = useTransform(visitSmooth, [0, 1], ['4%', '-5%']);
  const headlineAccentX = useTransform(visitSmooth, [0, 1], ['0%', '-3%']);

  return (
    <>
      <section
        id="landing-visit"
        ref={visitRef}
        className="landing-visit landing-visit--hall landing-visit--simple grain-overlay landing-parallax-scene"
      >
        <SectionScrollSeam targetRef={visitRef} variant="dark" />

        <ParallaxMotion
          modes={['shift-y', 'fade']}
          y={ambientY}
          opacity={ambientOpacity}
          className="landing-visit__ambient"
          aria-hidden
        />

        <ParallaxMotion
          modes={['transform', 'fade']}
          x={visitMediaX}
          y={visitMediaY}
          scale={visitMediaScale}
          opacity={visitMediaOpacity}
          className="landing-visit__media"
          aria-hidden
        >
          <ParallaxMotion modes={['transform']} y={mediaInnerY} scale={mediaInnerScale} className="landing-visit__media-inner">
            <Image src={DEFAULT_FOOD_HALL_IMAGE} alt="" fill sizes="100vw" className="object-cover" />
          </ParallaxMotion>
          <ParallaxMotion modes={['shift-y', 'fade']} y={scrimY} opacity={scrimOpacity} className="landing-visit__scrim-wrap">
            <div className="landing-visit__scrim" />
          </ParallaxMotion>
        </ParallaxMotion>

        <StudioContainer className="landing-visit__inner">
          <div className="landing-visit__grid">
            <ParallaxMotion modes={['shift-y']} y={copyY}>
              <motion.div
                initial="initial"
                whileInView="animate"
                viewport={{ once: true, margin: '-60px' }}
                variants={SLIDE_UP_VARIANTS}
                className="landing-visit__copy"
              >
                <header className="landing-visit__header">
                  <div className="landing-visit__header-top">
                    <SectionLabel index={visit.index} label={visit.label} dark hall />
                    <span className="hall-badge">{visit.stamp}</span>
                  </div>
                  <StudioHeading size="display" className="landing-visit__headline">
                    {visit.headline[0]}
                    <ParallaxMotion modes={['shift-x']} x={headlineAccentX} as="span" className="landing-heading__accent-light">
                      {visit.headline[1]}
                    </ParallaxMotion>
                  </StudioHeading>
                  <span className="hall-rule" aria-hidden />
                  <p className="landing-visit__lede">{visit.lede}</p>
                  <p className="landing-visit__sub">{visit.sub}</p>
                  <p className="landing-visit__aside">{visit.aside}</p>
                </header>

                <motion.dl
                  className="landing-visit__stats"
                  initial="initial"
                  whileInView="animate"
                  viewport={{ once: true, margin: '-40px' }}
                  variants={STAGGER_CONTAINER_VARIANTS}
                >
                  {visit.stats.map((item, index) => (
                    <VisitStatParallax key={item.label} progress={visitSmooth} index={index}>
                      <motion.div className="landing-visit__stat" variants={STAT_VARIANTS} transition={{ delay: index * 0.09 }}>
                        <dt className="landing-visit__stat-index">{String(index + 1).padStart(2, '0')}</dt>
                        <dd>
                          <span className="landing-visit__stat-label font-display">{item.label}</span>
                          <span className="landing-visit__stat-detail">{item.sub}</span>
                        </dd>
                      </motion.div>
                    </VisitStatParallax>
                  ))}
                </motion.dl>
              </motion.div>
            </ParallaxMotion>

            <ParallaxMotion modes={['transform']} x={cardX} y={cardY} rotateY={cardRotateY}>
              <motion.aside
                initial={{ opacity: 0, y: 32 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
                className="landing-visit__card hall-glass"
              >
                <p className="landing-visit__card-kicker">{visit.card.kicker}</p>
                <h3 className="landing-visit__card-title font-display">{visit.card.title}</h3>
                <p className="landing-visit__card-body">{visit.card.body}</p>

                <ul className="landing-visit__details">
                  <li>
                    <MapPin className="h-4 w-4 shrink-0" aria-hidden />
                    <span>
                      {SITE_STREET}, {SITE_LOCALITY}, {SITE_REGION}
                    </span>
                  </li>
                  <li>
                    <Clock className="h-4 w-4 shrink-0" aria-hidden />
                    <span>{formatHoursRange(SITE_HOURS_OPENS ?? '11:00', SITE_HOURS_CLOSES ?? '22:00')}</span>
                  </li>
                  {SITE_PHONE && (
                    <li>
                      <Phone className="h-4 w-4 shrink-0" aria-hidden />
                      <Link href={`tel:${SITE_PHONE.replace(/\D/g, '')}`}>{SITE_PHONE}</Link>
                    </li>
                  )}
                </ul>

                <HallCta
                  href={visit.card.cta.href}
                  label={visit.card.cta.label}
                  variant="primary"
                  dark
                  className="landing-visit__card-cta"
                  icon={<ArrowRight className="h-4 w-4" aria-hidden />}
                />
              </motion.aside>
            </ParallaxMotion>
          </div>
        </StudioContainer>
      </section>

      <HallFoodParallaxBreak frame={morningFrame} step={1} total={3} />

      <VisitContinuedBand id="landing-gatherings">
        <HallGatherings />
      </VisitContinuedBand>

      <HallFoodParallaxBreak frame={passFrame} step={2} total={3} />

      <HallBeyondSection />

      <HallFoodParallaxBreak frame={gatherFrame} step={3} total={3} />

      <VisitContinuedBand id="landing-directions">
        <HallGettingHere />
      </VisitContinuedBand>
    </>
  );
}
