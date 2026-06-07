'use client';

import { useEffect, useState } from 'react';
import { HALL_FOOD_PARALLAX_FRAMES } from '../constants';

/** Tracks which food parallax band is currently centered in view */
export function useFoodStoryNav() {
  const [activePass, setActivePass] = useState<string | null>(null);

  useEffect(() => {
    const visibility = new Map<string, boolean>();
    const observers: IntersectionObserver[] = [];

    HALL_FOOD_PARALLAX_FRAMES.forEach(({ id }) => {
      const el = document.querySelector(`[data-food-pass="${id}"]`);
      if (!el) return;

      const observer = new IntersectionObserver(
        ([entry]) => {
          visibility.set(id, entry.isIntersecting);
          const current = HALL_FOOD_PARALLAX_FRAMES.find((frame) => visibility.get(frame.id));
          setActivePass(current?.id ?? null);
        },
        { rootMargin: '-35% 0px -35% 0px', threshold: 0 },
      );

      observer.observe(el);
      observers.push(observer);
    });

    return () => observers.forEach((o) => o.disconnect());
  }, []);

  return { activePass, inFoodTour: activePass !== null };
}
