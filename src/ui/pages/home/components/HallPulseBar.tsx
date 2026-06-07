'use client';

import Link from 'next/link';
import { Clock, MapPin, UtensilsCrossed } from 'lucide-react';
import { LANDING_COPY } from '../copy';
import { useHallDaypart } from '../hooks/useHallDaypart';
import { SITE_HOURS_CLOSES, SITE_HOURS_OPENS, SITE_LOCALITY, SITE_STREET } from '@utils/seo';
import { formatHourLabel } from '../utils/hallTime';

const { pulse, daypart: daypartCopy } = LANDING_COPY;

export function HallPulseBar() {
  const { daypart, isOpen } = useHallDaypart();
  const day = daypartCopy[daypart];
  const { ribbon } = LANDING_COPY.hero;

  return (
    <div className="landing-pulse" role="region" aria-label="Hall status and quick links">
      <div className="landing-pulse__daypart">
        <p className="landing-pulse__daypart-greeting font-display">{day.greeting}</p>
        <p className="landing-pulse__daypart-hint">{day.hint}</p>
        <p className="landing-pulse__daypart-suggest">
          <span className="landing-pulse__daypart-label">Try</span> {day.suggestion}
        </p>
      </div>

      <div className="landing-pulse__inner">
        <div className="landing-pulse__status">
          <span
            className={`landing-pulse__dot ${isOpen === true ? 'landing-pulse__dot--open' : isOpen === false ? 'landing-pulse__dot--closed' : ''}`}
            aria-hidden
          />
          <span className="landing-pulse__status-text">
            {isOpen === null ? 'Checking hours…' : isOpen ? ribbon.statusOpen : ribbon.statusClosed}
          </span>
          <span className="landing-pulse__sep" aria-hidden>·</span>
          <Clock className="landing-pulse__icon" aria-hidden />
          <span className="landing-pulse__hours">
            {ribbon.hoursLabel} {formatHourLabel(SITE_HOURS_OPENS ?? '11:00')} –{' '}
            {formatHourLabel(SITE_HOURS_CLOSES ?? '22:00')}
          </span>
          <span className="landing-pulse__sep landing-pulse__sep--hide-sm" aria-hidden>·</span>
          <MapPin className="landing-pulse__icon landing-pulse__icon--hide-sm" aria-hidden />
          <span className="landing-pulse__address landing-pulse__address--hide-sm">
            {SITE_STREET}, {SITE_LOCALITY}
          </span>
        </div>

        <nav className="landing-pulse__nav" aria-label="Quick hall links">
          <Link href={pulse.menu.href} className="landing-pulse__link landing-pulse__link--primary">
            <UtensilsCrossed className="h-3.5 w-3.5" aria-hidden />
            {pulse.menu.label}
          </Link>
          <Link href={pulse.vendors.href} className="landing-pulse__link">
            {pulse.vendors.label}
          </Link>
          <Link href={pulse.visit.href} className="landing-pulse__link">
            {pulse.visit.label}
          </Link>
          <Link href={pulse.events.href} className="landing-pulse__link landing-pulse__link--hide-sm">
            {pulse.events.label}
          </Link>
          <Link href={pulse.directions.href} className="landing-pulse__link landing-pulse__link--hide-sm">
            {pulse.directions.label}
          </Link>
        </nav>
      </div>
    </div>
  );
}
