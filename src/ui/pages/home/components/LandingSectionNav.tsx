'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import type { MouseEvent } from 'react';
import {
  motion,
  useMotionValueEvent,
  useTransform,
  type MotionValue,
} from 'framer-motion';
import { ArrowUp, ChevronDown, MapPin, UtensilsCrossed } from 'lucide-react';
import { LANDING_COPY, LANDING_SECTIONS } from '../copy';
import { useHallDaypart } from '../hooks/useHallDaypart';
import { useFoodStoryNav } from '../hooks/useFoodStoryNav';
import {
  scrollToLandingSection,
  scrollToTop,
  useLandingSectionNav,
} from '../hooks/useLandingSectionNav';
import { formatHoursRange } from '../utils/hallTime';
import { isLandingDarkSection } from '../utils/landingNav';
import { SITE_HOURS_CLOSES, SITE_HOURS_OPENS } from '@utils/seo';
import { ParallaxMotion } from './ParallaxMotion';

type LandingSectionNavProps = {
  progress: MotionValue<number>;
};

export function LandingSectionNav({ progress }: LandingSectionNavProps) {
  const { activeId, activeSection, activeIndex, pastHero } = useLandingSectionNav();
  const { isOpen } = useHallDaypart();
  const { inFoodTour } = useFoodStoryNav();
  const { pulse } = LANDING_COPY;
  const nextSection = LANDING_SECTIONS[activeIndex + 1];
  const fillHeight = useTransform(progress, [0, 1], ['0%', '100%']);
  const fillTipY = useTransform(progress, [0, 1], ['0%', '100%']);
  const fillGlowOpacity = useTransform(progress, [0, 0.12, 0.88, 1], [0.35, 0.95, 0.95, 0.45]);
  const onDark = isLandingDarkSection(activeId);

  const pillsRef = useRef<HTMLDivElement>(null);
  const [scrollPct, setScrollPct] = useState(0);

  useMotionValueEvent(progress, 'change', (v) => setScrollPct(v));
  const showTop = scrollPct > 0.72 && !inFoodTour;

  useEffect(() => {
    const track = pillsRef.current;
    if (!track) return;
    const active = track.querySelector<HTMLElement>(`[data-section="${activeId}"]`);
    active?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
  }, [activeId]);

  const handleSectionClick = (id: string) => (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    scrollToLandingSection(id);
  };

  const hoursLabel = formatHoursRange(SITE_HOURS_OPENS ?? '11:00', SITE_HOURS_CLOSES ?? '22:00');

  return (
    <>
      <motion.div
        className="landing-guide"
        aria-hidden={!pastHero}
        initial={false}
        animate={{ y: pastHero ? 0 : '-110%', opacity: pastHero ? 1 : 0 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="landing-guide__status" aria-live="polite">
          <span className="landing-guide__you-are">You are here</span>
          <span className="landing-guide__current font-display">{activeSection.label}</span>
          {nextSection && (
            <button
              type="button"
              className="landing-guide__next"
              onClick={() => scrollToLandingSection(nextSection.id)}
            >
              Next: {nextSection.shortLabel}
              <ChevronDown className="h-3.5 w-3.5" aria-hidden />
            </button>
          )}
        </div>

        <span
          className={`landing-guide__open${isOpen === true ? ' landing-guide__open--yes' : isOpen === false ? ' landing-guide__open--no' : ''}`}
        >
          <span className="landing-guide__open-dot" aria-hidden />
          {isOpen === null ? '…' : isOpen ? 'Open' : 'Closed'}
          <span className="landing-guide__open-hours">{hoursLabel}</span>
        </span>

        <nav className="landing-guide__pills" aria-label="Jump to section">
          <div className="landing-guide__pills-track" ref={pillsRef}>
            {LANDING_SECTIONS.map(({ id, shortLabel }) => (
              <a
                key={id}
                href={`#${id}`}
                data-section={id}
                onClick={handleSectionClick(id)}
                className={`landing-guide__pill${activeId === id ? ' landing-guide__pill--active' : ''}`}
                aria-current={activeId === id ? 'true' : undefined}
              >
                {shortLabel}
              </a>
            ))}
          </div>
        </nav>

        <div className="landing-guide__actions">
          <Link href={pulse.menu.href} className="landing-guide__order">
            <UtensilsCrossed className="h-3.5 w-3.5" aria-hidden />
            {pulse.menu.label}
          </Link>
          <Link href={pulse.directions.href} className="landing-guide__map" aria-label={pulse.directions.label}>
            <MapPin className="h-4 w-4" aria-hidden />
          </Link>
        </div>
      </motion.div>

      <nav
        className={`landing-side-nav${onDark ? ' landing-side-nav--on-dark' : ''}`}
        aria-label="Page sections"
      >
        <div className="landing-side-nav__track" aria-hidden>
          <ParallaxMotion className="landing-side-nav__fill" modes={['height']} height={fillHeight} />
          <ParallaxMotion
            modes={['shift-y', 'fade']}
            y={fillTipY}
            opacity={fillGlowOpacity}
            className="landing-side-nav__fill-tip"
          />
        </div>

        <ol className="landing-side-nav__list">
          {LANDING_SECTIONS.map(({ id, label, hint }, index) => (
            <li key={id}>
              <a
                href={`#${id}`}
                onClick={handleSectionClick(id)}
                className={`landing-side-nav__link${activeId === id ? ' landing-side-nav__link--active' : ''}`}
                aria-current={activeId === id ? 'true' : undefined}
              >
                <span className="landing-side-nav__marker" aria-hidden />
                <span className="landing-side-nav__text">
                  <span className="landing-side-nav__label">{label}</span>
                  <span className="landing-side-nav__hint">{hint}</span>
                </span>
                <span className="landing-side-nav__step" aria-hidden>
                  {String(index + 1).padStart(2, '0')}
                </span>
              </a>
            </li>
          ))}
        </ol>

        <p className="landing-side-nav__footer font-display">{activeSection.label}</p>
      </nav>

      <motion.button
        type="button"
        className={`landing-back-top${inFoodTour ? ' landing-back-top--offset' : ''}`}
        aria-label="Back to top"
        initial={false}
        animate={{ opacity: showTop ? 1 : 0, y: showTop ? 0 : 12, pointerEvents: showTop ? 'auto' : 'none' }}
        transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
        onClick={scrollToTop}
      >
        <ArrowUp className="h-4 w-4" aria-hidden />
        <span>Top</span>
      </motion.button>
    </>
  );
}
