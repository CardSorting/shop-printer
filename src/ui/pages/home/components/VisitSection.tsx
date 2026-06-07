'use client';

import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, Clock, MapPin, Phone } from 'lucide-react';
import { SLIDE_UP_VARIANTS } from '@ui/animations';
import { DEFAULT_FOOD_HALL_IMAGE } from '@utils/imageFallback';
import { LANDING_COPY } from '../copy';
import { HALL_FOOD_PARALLAX_FRAMES } from '../constants';
import { HallBeyondSection } from './HallBeyondSection';
import { HallFoodParallaxBreak } from './HallFoodParallaxBreak';
import { HallGatherings } from './HallGatherings';
import { HallGettingHere } from './HallGettingHere';
import { HallCta } from './HallCta';
import { SectionLabel, StudioContainer, StudioHeading } from './StudioShell';
import { formatHoursRange } from '../utils/hallTime';
import {
  SITE_HOURS_CLOSES,
  SITE_HOURS_OPENS,
  SITE_LOCALITY,
  SITE_PHONE,
  SITE_REGION,
  SITE_STREET,
} from '@utils/seo';

const { visit } = LANDING_COPY;

const [morningFrame, passFrame, gatherFrame] = HALL_FOOD_PARALLAX_FRAMES;

export function VisitSection() {
  return (
    <>
      <section id="landing-visit" className="landing-visit landing-visit--hall landing-visit--simple grain-overlay">
        <div className="landing-visit__media" aria-hidden>
          <Image src={DEFAULT_FOOD_HALL_IMAGE} alt="" fill sizes="100vw" className="object-cover" />
          <div className="landing-visit__scrim" />
        </div>

        <StudioContainer className="landing-visit__inner">
          <div className="landing-visit__grid">
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
                  <span className="landing-heading__accent-light">{visit.headline[1]}</span>
                </StudioHeading>
                <span className="hall-rule" aria-hidden />
                <p className="landing-visit__lede">{visit.lede}</p>
                <p className="landing-visit__sub">{visit.sub}</p>
                <p className="landing-visit__aside">{visit.aside}</p>
              </header>

              <dl className="landing-visit__stats">
                {visit.stats.map((item, index) => (
                  <div key={item.label} className="landing-visit__stat">
                    <dt className="landing-visit__stat-index">{String(index + 1).padStart(2, '0')}</dt>
                    <dd>
                      <span className="landing-visit__stat-label font-display">{item.label}</span>
                      <span className="landing-visit__stat-detail">{item.sub}</span>
                    </dd>
                  </div>
                ))}
              </dl>
            </motion.div>

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
          </div>
        </StudioContainer>
      </section>

      <HallFoodParallaxBreak frame={morningFrame} />

      <section className="landing-visit landing-visit--continued">
        <StudioContainer className="landing-visit__inner">
          <HallGatherings />
        </StudioContainer>
      </section>

      <HallFoodParallaxBreak frame={passFrame} />

      <HallBeyondSection />

      <HallFoodParallaxBreak frame={gatherFrame} />

      <section className="landing-visit landing-visit--continued">
        <StudioContainer className="landing-visit__inner">
          <HallGettingHere />
        </StudioContainer>
      </section>
    </>
  );
}
