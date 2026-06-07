'use client';

import { useEffect, useState } from 'react';
import { LANDING_SECTIONS } from '../copy';

export type LandingSection = (typeof LANDING_SECTIONS)[number];

/** Tracks which landing section is in view — shared by sticky nav + side rail */
export function useLandingSectionNav() {
  const [activeId, setActiveId] = useState<string>(LANDING_SECTIONS[0].id);
  const [pastHero, setPastHero] = useState(false);

  useEffect(() => {
    const sectionObservers: IntersectionObserver[] = [];

    LANDING_SECTIONS.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (!el) return;

      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) setActiveId(id);
        },
        { rootMargin: '-38% 0px -38% 0px', threshold: 0 },
      );

      observer.observe(el);
      sectionObservers.push(observer);
    });

    const hero = document.getElementById('landing-hero');
    let heroObserver: IntersectionObserver | undefined;

    if (hero) {
      heroObserver = new IntersectionObserver(
        ([entry]) => setPastHero(!entry.isIntersecting),
        { threshold: 0, rootMargin: '-20% 0px 0px 0px' },
      );
      heroObserver.observe(hero);
    }

    return () => {
      sectionObservers.forEach((o) => o.disconnect());
      heroObserver?.disconnect();
    };
  }, []);

  const activeSection = LANDING_SECTIONS.find((s) => s.id === activeId) ?? LANDING_SECTIONS[0];
  const activeIndex = LANDING_SECTIONS.findIndex((s) => s.id === activeId);

  return { activeId, activeSection, activeIndex, pastHero };
}

export function scrollToLandingSection(id: string) {
  const el = document.getElementById(id);
  if (!el) return;

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
  history.replaceState(null, '', `#${id}`);

  if (!el.hasAttribute('tabindex')) {
    el.setAttribute('tabindex', '-1');
  }
  el.focus({ preventScroll: true });
}

export function scrollToTop() {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
  history.replaceState(null, '', window.location.pathname);
}
