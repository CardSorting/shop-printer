import Image from 'next/image';
import { ArrowRight } from 'lucide-react';
import { LANDING_COPY, LANDING_SEO_HEADLINE } from '../copy';
import { getHallDaypart, isHallOpenNow, formatHoursRange } from '../utils/hallTime';
import { HallCta } from './HallCta';
import { HallInfoRibbon } from './HallInfoRibbon';
import { HeroScrollCue } from './HeroScrollCue';
import { LandingGradientOverlay } from './LandingGradientOverlay';
import { StudioContainer } from './StudioShell';
import { SITE_HOURS_CLOSES, SITE_HOURS_OPENS } from '@utils/seo';

const HERO_FOOD_SPREAD_IMAGE = '/images/landing/hero-food-spread.webp';
const { hero } = LANDING_COPY;

export function HeroSection() {
  const daypart = getHallDaypart();
  const isOpen = isHallOpenNow();
  const daypartHero = hero.byDaypart[daypart];

  const hoursLabel = formatHoursRange(SITE_HOURS_OPENS ?? '11:00', SITE_HOURS_CLOSES ?? '22:00');
  const openLabel = isOpen ? hero.ribbon.statusOpen : hero.ribbon.statusClosed;

  return (
    <section
      id="landing-hero"
      className="landing-hero landing-hero--hall landing-hero--simple landing-hero--cinematic"
    >
      <div className="landing-hero__media-reveal landing-hero__media-reveal--enter">
        <div className="landing-hero__media" aria-hidden>
          <div className="landing-hero__media-inner">
            <Image
              src={HERO_FOOD_SPREAD_IMAGE}
              alt=""
              fill
              priority
              quality={68}
              sizes="100vw"
              className="object-cover"
            />
          </div>
          <LandingGradientOverlay variant="hero" />
          <LandingGradientOverlay variant="hero-vignette" />
          <div className="landing-hero__media-gradient" aria-hidden />
        </div>
      </div>

      <LandingGradientOverlay variant="hero-cinema" />
      <div className="landing-hero__depth-haze" aria-hidden />
      <span className="landing-hero__cinema-rail landing-hero__cinema-rail--head" aria-hidden />
      <span className="landing-hero__cinema-rail landing-hero__cinema-rail--foot" aria-hidden />

      <p className="landing-hero__location-pill landing-hero__location-pill--enter" aria-label="Location">
        {hero.coords}
      </p>

      <StudioContainer className="landing-hero__content landing-hero__content--simple">
        <article
          className="landing-hero__card hall-glass landing-hero__card--enter"
          aria-label="Welcome to WoodBine"
        >
          <span className="landing-hero__card-glow" aria-hidden />
          <span className="landing-hero__card-accent landing-hero__card-accent--enter" aria-hidden />

          <div className="landing-hero__mobile-meta">
            <span
              className={`landing-hero__mobile-dot${isOpen ? ' landing-hero__mobile-dot--open' : ' landing-hero__mobile-dot--closed'}`}
              aria-hidden
            />
            <span className="landing-hero__mobile-status">{openLabel}</span>
            <span className="landing-hero__mobile-sep" aria-hidden>·</span>
            <span className="landing-hero__mobile-hours">{hoursLabel}</span>
          </div>

          <HallInfoRibbon hoursLabel={hoursLabel} vibe={LANDING_COPY.daypart[daypart].greeting} />

          <p className="landing-hero__kicker">{hero.kicker}</p>

          <div className="landing-hero__headline-lockup">
            <h1
              data-seo-speakable
              className="landing-heading landing-heading--hero"
              aria-label={LANDING_SEO_HEADLINE}
            >
              <span className="sr-only">{LANDING_SEO_HEADLINE}</span>
              <span className="landing-hero__headline-line">
                <span className="landing-hero__line font-display">{hero.headline[0]}</span>
              </span>
              <span className="landing-hero__headline-line">
                <span className="landing-hero__line font-display landing-heading__accent-light">
                  {hero.headline[1]}
                </span>
              </span>
            </h1>
          </div>

          <div className="landing-hero__rule landing-hero__rule--enter" />

          <p className="landing-hero__lede">{daypartHero.lede}</p>
          <p className="landing-hero__tagline">{daypartHero.aside}</p>

          <div className="landing-hero__actions">
            <HallCta
              href={hero.cta.primary.href}
              label={hero.cta.primary.label}
              icon={<ArrowRight className="h-4 w-4" />}
            />
            <HallCta href={hero.cta.secondary.href} label={hero.cta.secondary.label} variant="ghost" />
          </div>
        </article>
      </StudioContainer>

      <HeroScrollCue href="#landing-vendors" label={hero.scroll} />
    </section>
  );
}
