'use client';

import { useEffect, useState } from 'react';

/** Desktop-only — counter hover videos are too heavy on mobile */
export function useMinViewportWidth(minWidth: number) {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(`(min-width: ${minWidth}px)`);
    const sync = () => setMatches(media.matches);
    sync();
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, [minWidth]);

  return matches;
}
