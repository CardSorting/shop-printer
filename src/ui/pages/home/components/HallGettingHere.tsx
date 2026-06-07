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

export function HallGettingHere() {
  const mapsUrl = getMapsSearchUrl(street, locality, region, SITE_GEO_LAT, SITE_GEO_LNG);
  const embedUrl = getMapsEmbedUrl(street, locality, region, SITE_GEO_LAT, SITE_GEO_LNG);

  return (
    <div className="landing-getting-here" aria-labelledby="getting-here-heading">
      <header className="landing-getting-here__header">
        <p className="landing-getting-here__label">{gettingHere.label}</p>
        <h3 id="getting-here-heading" className="landing-getting-here__headline font-display">
          {gettingHere.headline}
        </h3>
      </header>

      <div className="landing-getting-here__layout">
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

        <div className="landing-getting-here__details">
          <ul className="landing-getting-here__list">
            <li>
              <MapPin className="h-4 w-4 shrink-0" aria-hidden />
              <div>
                <span className="landing-getting-here__item-label">{gettingHere.address.label}</span>
                <span className="landing-getting-here__item-detail">{addressLine}</span>
              </div>
            </li>
            <li>
              <Car className="h-4 w-4 shrink-0" aria-hidden />
              <div>
                <span className="landing-getting-here__item-label">{gettingHere.parking.label}</span>
                <span className="landing-getting-here__item-detail">{gettingHere.parking.detail}</span>
              </div>
            </li>
            <li>
              <Navigation className="h-4 w-4 shrink-0" aria-hidden />
              <div>
                <span className="landing-getting-here__item-label">{gettingHere.arrival.label}</span>
                <span className="landing-getting-here__item-detail">{gettingHere.arrival.detail}</span>
              </div>
            </li>
          </ul>

          <Link href={mapsUrl} target="_blank" rel="noopener noreferrer" className="landing-getting-here__directions">
            Get directions
            <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </div>
      </div>
    </div>
  );
}
