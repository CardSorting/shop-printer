'use client';

import { useEffect, useState } from 'react';
import type { MotionValue } from 'framer-motion';

/** Subscribe to a motion value without re-rendering every frame (rAF + dedupe). */
export function useThrottledMotionPercent(progress: MotionValue<number>): number {
  const [pct, setPct] = useState(0);

  useEffect(() => {
    let raf = 0;
    let last = -1;

    const commit = (v: number) => {
      const next = Math.round(v * 100);
      if (next === last) return;
      last = next;
      setPct(next);
    };

    const onChange = (v: number) => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        commit(v);
      });
    };

    commit(progress.get());
    const unsub = progress.on('change', onChange);
    return () => {
      unsub();
      if (raf) cancelAnimationFrame(raf);
    };
  }, [progress]);

  return pct;
}

/** Defer non-critical chrome until the browser is idle (hero paints first). */
export function useIdleMount(fallbackMs = 350): boolean {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const run = () => setReady(true);
    if (typeof requestIdleCallback !== 'undefined') {
      const id = requestIdleCallback(run, { timeout: 900 });
      return () => cancelIdleCallback(id);
    }
    const t = window.setTimeout(run, fallbackMs);
    return () => window.clearTimeout(t);
  }, [fallbackMs]);

  return ready;
}
