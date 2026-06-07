'use client';

import Image from 'next/image';
import { ArrowRight } from 'lucide-react';
import { DEFAULT_FOOD_HALL_IMAGE } from '@utils/imageFallback';
import { LANDING_COPY, LANDING_SEO_HEADLINE } from '../copy';
import { useHallDaypart } from '../hooks/useHallDaypart';
import { HallCta } from './HallCta';
import { HallInfoRibbon } from './HallInfoRibbon';
import { StudioContainer } from './StudioShell';
import { formatHoursRange } from '../utils/hallTime';
import { SITE_HOURS_CLOSES, SITE_HOURS_OPENS } from '@utils/seo';

const { hero } = LANDING_COPY;

export function HeroSection() {
  const { daypart } = useHallDaypart();
  const daypartHero = hero.byDaypart[daypart];

  return (
    <section id="landing-hero" className="landing-hero landing-hero--hall landing-hero--simple grain-overlay">
      <div className="landing-hero__media" aria-hidden>
        <Image
          src={DEFAULT_FOOD_HALL_IMAGE}
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        <div className="landing-hero__media-gradient" />
        <div className="landing-hero__media-vignette" />
      </div>

      <p className="landing-hero__location-pill" aria-label="Location">
        {hero.coords}
      </p>

      <StudioContainer className="landing-hero__content landing-hero__content--simple">
        <HallInfoRibbon
          hoursLabel={formatHoursRange(SITE_HOURS_OPENS ?? '11:00', SITE_HOURS_CLOSES ?? '22:00')}
          vibe={LANDING_COPY.daypart[daypart].greeting}
        />

        <div className="landing-hero__copy landing-hero__copy--simple">
          <p className="landing-hero__kicker">{hero.kicker}</p>

          <h1
            data-seo-speakable
            className="landing-heading landing-heading--hero"
            aria-label={LANDING_SEO_HEADLINE}
          >
            <span className="sr-only">{LANDING_SEO_HEADLINE}</span>
            <span className="landing-hero__line font-display">{hero.headline[0]}</span>
            <span className="landing-hero__line font-display landing-heading__accent-light">
              {hero.headline[1]}
            </span>
          </h1>

          <div className="landing-hero__rule" />

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
        </div>
      </StudioContainer>
    </section>
  );
}
