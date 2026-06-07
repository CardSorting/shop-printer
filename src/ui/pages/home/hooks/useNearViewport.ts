'use client';

import { useEffect, useState, type RefObject } from 'react';

/** Tracks whether an element is near or inside the viewport */
export function useNearViewport<T extends Element>(
  ref: RefObject<T | null>,
  rootMargin = '160px 0px',
) {
  const [near, setNear] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => setNear(entry.isIntersecting),
      { rootMargin },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [ref, rootMargin]);

  return near;
}
