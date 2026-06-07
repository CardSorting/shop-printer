'use client';

import { useEffect, useState } from 'react';
import type { MotionValue } from 'framer-motion';
import { LANDING_SECTIONS } from '../copy';

type HallNavRailProps = {
  progress: MotionValue<number>;
};

export function HallNavRail({ progress }: HallNavRailProps) {
  const [activeId, setActiveId] = useState<string>(LANDING_SECTIONS[0].id);

  void progress;

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

  const active = LANDING_SECTIONS.find((s) => s.id === activeId);

  return (
    <nav className="hall-nav-rail" aria-label="Hall sections">
      <ol className="hall-nav-rail__list">
        {LANDING_SECTIONS.map(({ id, label }) => (
          <li key={id}>
            <a
              href={`#${id}`}
              className={`hall-nav-rail__link ${activeId === id ? 'hall-nav-rail__link--active' : ''}`}
              aria-current={activeId === id ? 'true' : undefined}
            >
              <span className="hall-nav-rail__dot" aria-hidden />
              <span className="hall-nav-rail__label">{label}</span>
            </a>
          </li>
        ))}
      </ol>
      {active && <p className="hall-nav-rail__active font-display">{active.label}</p>}
    </nav>
  );
}
