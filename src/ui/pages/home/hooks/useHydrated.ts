'use client';

import { useEffect, useState } from 'react';

/** True after the first client paint — use to gate live clocks / timers. */
export function useHydrated(): boolean {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  return hydrated;
}
