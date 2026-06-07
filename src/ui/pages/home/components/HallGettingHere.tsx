'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ArrowUpRight, Car, MapPin, Navigation } from 'lucide-react';
import { WOODBINE_LOCAL_BUSINESS_DEFAULTS } from '@domain/seo/local-business-defaults';
import { LANDING_COPY } from '../copy';
import { getMapsSearchUrl } from '../utils/hallMaps';
import { SITE_GEO_LAT, SITE_GEO_LNG, SITE_STREET, SITE_LOCALITY, SITE_REGION } from '@utils/seo';

const { gettingHere } = LANDING_COPY;
const { intro } = gettingHere;

const street = SITE_STREET ?? WOODBINE_LOCAL_BUSINESS_DEFAULTS.street;
const locality = SITE_LOCALITY ?? WOODBINE_LOCAL_BUSINESS_DEFAULTS.city;
const region = SITE_REGION ?? WOODBINE_LOCAL_BUSINESS_DEFAULTS.region;
const addressLine = `${street}, ${locality}, ${region}`;

const FOOD_PLATTER_IMAGE = '/images/landing/getting-here-food-platter.png';

const ROUTE_ROWS = [
  { icon: MapPin, label: gettingHere.address.label, detail: addressLine },
  { icon: Car, label: gettingHere.parking.label, detail: gettingHere.parking.detail },
  { icon: Navigation, label: gettingHere.arrival.label, detail: gettingHere.arrival.detail },
] as const;

export function HallGettingHere() {
  const mapsUrl = getMapsSearchUrl(street, locality, region, SITE_GEO_LAT, SITE_GEO_LNG);

  return (
    <section className="landing-getting-here hall-glass" aria-labelledby="getting-here-heading">
      <header className="landing-getting-here__intro">
        <div className="landing-getting-here__intro-row">
          <p className="landing-getting-here__label">{intro.label}</p>
          <span className="hall-badge">{intro.stamp}</span>
        </div>
        <h3 id="getting-here-heading" className="landing-getting-here__headline font-display">
          {intro.headline}
        </h3>
        <span className="hall-rule landing-getting-here__rule" aria-hidden />
        <p className="landing-getting-here__sub">{intro.sub}</p>
        <p className="landing-getting-here__aside">{intro.aside}</p>
      </header>

      <div className="landing-getting-here__layout">
        <div className="landing-getting-here__visual">
          <div className="landing-getting-here__visual-frame">
            <Image
              src={FOOD_PLATTER_IMAGE}
              alt=""
              fill
              sizes="(max-width: 768px) 100vw, 55vw"
              className="landing-getting-here__visual-image object-cover"
            />
            <div className="landing-getting-here__visual-scrim" aria-hidden />
            <Link
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="landing-getting-here__visual-cta"
            >
              {gettingHere.mapsCta}
              <ArrowUpRight className="h-3.5 w-3.5 shrink-0" aria-hidden />
            </Link>
          </div>
          <p className="landing-getting-here__visual-caption">{gettingHere.mapCaption}</p>
        </div>

        <aside className="landing-getting-here__route" aria-label="Directions and arrival details">
          <div>
            <p className="landing-getting-here__route-kicker">{gettingHere.routeKicker}</p>
            <p className="landing-getting-here__eta">{gettingHere.marginNote}</p>
          </div>

          <ul className="landing-getting-here__list">
            {ROUTE_ROWS.map((row) => {
              const Icon = row.icon;

              return (
                <li key={row.label} className="landing-getting-here__list-item">
                  <span className="landing-getting-here__row-icon" aria-hidden>
                    <Icon className="h-4 w-4" />
                  </span>
                  <div>
                    <span className="landing-getting-here__item-label">{row.label}</span>
                    <span className="landing-getting-here__item-detail">{row.detail}</span>
                  </div>
                </li>
              );
            })}
          </ul>

          <Link
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="landing-getting-here__directions"
          >
            {gettingHere.directionsLabel}
            <ArrowUpRight className="h-3.5 w-3.5 shrink-0" aria-hidden />
          </Link>
        </aside>
      </div>
    </section>
  );
}
