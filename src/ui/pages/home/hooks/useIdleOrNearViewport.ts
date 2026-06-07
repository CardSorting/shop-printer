'use client';

import { useEffect, useRef, useState } from 'react';

type Options = {
  rootMargin?: string;
  idleTimeoutMs?: number;
  /** When false, below-fold chunks load only after scroll — not on idle timeout */
  idleFallback?: boolean;
  /** Gate the observer until a parent section has activated */
  enabled?: boolean;
};

/** Defer heavy below-fold work until the block is near the viewport or the main thread is idle. */
export function useIdleOrNearViewport({
  rootMargin = '480px 0px',
  idleTimeoutMs = 3200,
  idleFallback = true,
  enabled = true,
}: Options = {}) {
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (!enabled || active) return;

    let cancelled = false;
    const activate = () => {
      if (!cancelled) setActive(true);
    };

    const idleId = idleFallback
      ? typeof window.requestIdleCallback === 'function'
        ? window.requestIdleCallback(activate, { timeout: idleTimeoutMs })
        : window.setTimeout(activate, idleTimeoutMs)
      : null;

    const node = ref.current;
    if (!node) {
      return () => {
        cancelled = true;
        if (idleId == null) return;
        if (typeof window.cancelIdleCallback === 'function') {
          window.cancelIdleCallback(idleId as number);
        } else {
          window.clearTimeout(idleId);
        }
      };
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) activate();
      },
      { rootMargin, threshold: 0 },
    );

    observer.observe(node);

    return () => {
      cancelled = true;
      observer.disconnect();
      if (idleId == null) return;
      if (typeof window.cancelIdleCallback === 'function') {
        window.cancelIdleCallback(idleId as number);
      } else {
        window.clearTimeout(idleId);
      }
    };
  }, [active, enabled, idleFallback, idleTimeoutMs, rootMargin]);

  return { ref, active };
}
