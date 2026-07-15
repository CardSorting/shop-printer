'use client';

import { useEffect, useState } from 'react';
import { LANDING_SECTIONS } from '../copy';

/** One intersection observer set for chapter rail + ticker (avoids duplicate IO). */
export function useLandingActiveSection(): { activeId: string; activeLabel: string } {
  const [activeId, setActiveId] = useState<string>(LANDING_SECTIONS[0].id);

  useEffect(() => {
    const observers: IntersectionObserver[] = [];

    LANDING_SECTIONS.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (!el) return;

      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) setActiveId(id);
        },
        { rootMargin: '-42% 0px -42% 0px', threshold: 0 },
      );

      observer.observe(el);
      observers.push(observer);
    });

    return () => observers.forEach((o) => o.disconnect());
  }, []);

  const active = LANDING_SECTIONS.find((s) => s.id === activeId) ?? LANDING_SECTIONS[0];
  return { activeId, activeLabel: active.label };
}
