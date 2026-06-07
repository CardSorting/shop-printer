import dynamic from 'next/dynamic';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Clock, MapPin, Phone } from 'lucide-react';
import { DEFAULT_FOOD_HALL_IMAGE } from '@utils/imageFallback';
import { LANDING_COPY } from '../copy';
import { HALL_FOOD_PARALLAX_FRAMES } from '../constants';
import { HallCta } from './HallCta';
import { LandingGradientOverlay } from './LandingGradientOverlay';
import { LandingSceneCut } from './LandingSceneCut';
import { DetailRow } from './DetailRow';
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
  { ssr: false },
);

const HallFoodParallaxBreak = dynamic(
  () => import('./HallFoodParallaxBreak').then((m) => ({ default: m.HallFoodParallaxBreak })),
  { ssr: false },
);

const HallGatherings = dynamic(
  () => import('./HallGatherings').then((m) => ({ default: m.HallGatherings })),
  { ssr: false },
);

const HallGettingHere = dynamic(
  () => import('./HallGettingHere').then((m) => ({ default: m.HallGettingHere })),
  { ssr: false },
);

const { visit } = LANDING_COPY;

const [morningFrame, passFrame, gatherFrame] = HALL_FOOD_PARALLAX_FRAMES;

export function VisitSection() {
  return (
    <>
      <section
        id="landing-visit"
        className="landing-visit landing-visit--hall landing-visit--simple landing-visit--cinematic landing-section-deferred"
      >
        <div className="landing-section-divider landing-section-divider--enter" aria-hidden />
        <LandingGradientOverlay variant="visit-ambient" />

        <div className="landing-visit__media landing-visit__media--static" aria-hidden>
          <div className="landing-visit__media-inner">
            <Image src={DEFAULT_FOOD_HALL_IMAGE} alt="" fill quality={68} sizes="100vw" className="object-cover" />
          </div>
          <LandingGradientOverlay variant="visit" />
          <div className="landing-visit__scrim-wrap">
            <div className="landing-visit__scrim" />
          </div>
        </div>

        <StudioContainer className="landing-visit__inner">
          <div className="landing-visit__grid landing-visit__grid--enter">
            <div className="landing-visit__copy">
              <header className="landing-visit__header">
                <div className="landing-visit__header-top">
                  <SectionLabel index={visit.index} label={visit.label} dark hall />
                  <span className="hall-badge">{visit.stamp}</span>
                </div>
                <StudioHeading size="display" className="landing-visit__headline">
                  {visit.headline[0]}
                  <span className="landing-heading__accent-light">{visit.headline[1]}</span>
                </StudioHeading>
                <div className="hall-rule landing-visit__rule" aria-hidden />
                <p className="landing-visit__lede">{visit.lede}</p>
                <p className="landing-visit__sub">{visit.sub}</p>
                <p className="landing-visit__aside">{visit.aside}</p>
              </header>

              <dl className="landing-visit__stats">
                {visit.stats.map((item, index) => (
                  <div key={item.label} className="landing-visit__stat" style={{ animationDelay: `${index * 30}ms` }}>
                    <dt className="landing-visit__stat-index">{String(index + 1).padStart(2, '0')}</dt>
                    <dd>
                      <span className="landing-visit__stat-label font-display">{item.label}</span>
                      <span className="landing-visit__stat-detail">{item.sub}</span>
                    </dd>
                  </div>
                ))}
              </dl>
            </div>

            <aside className="landing-visit__card hall-glass landing-visit__card--enter">
              <div className="landing-visit__card-inner">
                <p className="landing-visit__card-kicker">{visit.card.kicker}</p>
                <h3 className="landing-visit__card-title font-display">{visit.card.title}</h3>
                <p className="landing-visit__card-body">{visit.card.body}</p>

                <ul className="landing-visit__details">
                  <DetailRow icon={<MapPin className="h-4 w-4 shrink-0" aria-hidden />}>
                    {SITE_STREET}, {SITE_LOCALITY}, {SITE_REGION}
                  </DetailRow>
                  <DetailRow icon={<Clock className="h-4 w-4 shrink-0" aria-hidden />}>
                    {formatHoursRange(SITE_HOURS_OPENS ?? '11:00', SITE_HOURS_CLOSES ?? '22:00')}
                  </DetailRow>
                  {SITE_PHONE && (
                    <DetailRow icon={<Phone className="h-4 w-4 shrink-0" aria-hidden />}>
                      <Link href={`tel:${SITE_PHONE.replace(/\D/g, '')}`}>{SITE_PHONE}</Link>
                    </DetailRow>
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
              </div>
            </aside>
          </div>
        </StudioContainer>
      </section>

      <HallFoodParallaxBreak frame={morningFrame} step={1} total={3} />

      <LandingSceneCut compact from="03" to="04" title="Private events" subtitle="Team lunches · birthdays · after-hours buyouts" />

      <VisitContinuedBand id="landing-gatherings">
        <HallGatherings />
      </VisitContinuedBand>

      <HallFoodParallaxBreak frame={passFrame} step={2} total={3} />

      <LandingSceneCut compact from="04" to="05" title="The space" subtitle="Barrel roof · patio · what happens after you order" />

      <HallBeyondSection />

      <HallFoodParallaxBreak frame={gatherFrame} step={3} total={3} />

      <LandingSceneCut compact from="05" to="06" title="Find us" subtitle="500 West · street parking · follow the smoke" />

      <VisitContinuedBand id="landing-directions">
        <HallGettingHere />
      </VisitContinuedBand>
    </>
  );
}
