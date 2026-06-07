import Link from 'next/link';
import { ArrowUpRight, Car, MapPin, Navigation } from 'lucide-react';
import { WOODBINE_LOCAL_BUSINESS_DEFAULTS } from '@domain/seo/local-business-defaults';
import { LANDING_COPY } from '../copy';
import { getMapsEmbedUrl, getMapsSearchUrl } from '../utils/hallMaps';
import { SITE_GEO_LAT, SITE_GEO_LNG, SITE_STREET, SITE_LOCALITY, SITE_REGION } from '@utils/seo';

const { gettingHere } = LANDING_COPY;

const street = SITE_STREET ?? WOODBINE_LOCAL_BUSINESS_DEFAULTS.street;
const locality = SITE_LOCALITY ?? WOODBINE_LOCAL_BUSINESS_DEFAULTS.city;
const region = SITE_REGION ?? WOODBINE_LOCAL_BUSINESS_DEFAULTS.region;
const addressLine = `${street}, ${locality}, ${region}`;

const ROUTE_ROWS = [
  { icon: MapPin, label: gettingHere.address.label, detail: addressLine },
  { icon: Car, label: gettingHere.parking.label, detail: gettingHere.parking.detail },
  { icon: Navigation, label: gettingHere.arrival.label, detail: gettingHere.arrival.detail },
] as const;

export function HallGettingHere() {
  const mapsUrl = getMapsSearchUrl(street, locality, region, SITE_GEO_LAT, SITE_GEO_LNG);
  const embedUrl = getMapsEmbedUrl(SITE_GEO_LAT, SITE_GEO_LNG);

  return (
    <div className="landing-getting-here hall-glass" aria-labelledby="getting-here-heading">
      <header className="landing-getting-here__header">
        <div className="landing-getting-here__header-top">
          <p className="landing-getting-here__label">{gettingHere.label}</p>
          <span className="hall-badge">{gettingHere.stamp}</span>
        </div>
        <h3 id="getting-here-heading" className="landing-getting-here__headline font-display">
          {gettingHere.headline}
        </h3>
        <span className="hall-rule" aria-hidden />
        <p className="landing-getting-here__sub">{gettingHere.sub}</p>
        <p className="landing-getting-here__aside">{gettingHere.aside}</p>
      </header>

      <div className="landing-getting-here__layout">
        <div className="landing-getting-here__map-col">
          <div className="landing-getting-here__map-wrap">
            <iframe
              title={`Map showing WoodBine at ${addressLine}`}
              src={embedUrl}
              className="landing-getting-here__map"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              allowFullScreen
            />
            <div className="landing-getting-here__map-pin" aria-hidden>
              <span className="landing-getting-here__map-pin-dot" />
              <span className="landing-getting-here__map-pin-label">WoodBine</span>
            </div>
            <Link
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="landing-getting-here__map-cta"
            >
              {gettingHere.mapsCta}
              <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
          </div>
          <p className="landing-getting-here__map-caption">{gettingHere.mapCaption}</p>
        </div>

        <div className="landing-getting-here__details">
          <p className="landing-getting-here__route-kicker">{gettingHere.routeKicker}</p>
          <p className="landing-getting-here__eta">{gettingHere.marginNote}</p>

          <ul className="landing-getting-here__list">
            {ROUTE_ROWS.map((row) => {
              const Icon = row.icon;

              return (
                <li key={row.label}>
                  <Icon className="h-4 w-4 shrink-0" aria-hidden />
                  <div>
                    <span className="landing-getting-here__item-label">{row.label}</span>
                    <span className="landing-getting-here__item-detail">{row.detail}</span>
                  </div>
                </li>
              );
            })}
          </ul>

          <Link href={mapsUrl} target="_blank" rel="noopener noreferrer" className="landing-getting-here__directions">
            {gettingHere.directionsLabel}
            <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </div>
      </div>
    </div>
  );
}
