'use client';

import { useEffect, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * [LAYER: UI]
 * A premium navigation progress bar that gives visual feedback during route changes.
 * This bridges the perceived delay between link click and page transition.
 */
export function NavigationLoader() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const timeout = window.setTimeout(() => setLoading(false), 120);
    return () => window.clearTimeout(timeout);
  }, [pathname, searchParams]);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target.closest('a[href]') : null;
      if (!(target instanceof HTMLAnchorElement)) return;
      if (target.target && target.target !== '_self') return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.defaultPrevented) return;

      const nextUrl = new URL(target.href, window.location.href);
      if (nextUrl.origin !== window.location.origin) return;
      if (`${nextUrl.pathname}${nextUrl.search}` === `${window.location.pathname}${window.location.search}`) return;

      setLoading(true);
    };

    window.addEventListener('click', handleClick, true);
    return () => window.removeEventListener('click', handleClick, true);
  }, []);

  return (
    <AnimatePresence>
      {loading && (
        <motion.div
          aria-hidden="true"
          className="fixed left-0 right-0 top-0 z-[1000] h-1 origin-left bg-primary-500 shadow-[0_0_18px_rgba(245,158,11,0.45)]"
          initial={{ scaleX: 0, opacity: 0 }}
          animate={{ scaleX: 0.82, opacity: 1 }}
          exit={{ scaleX: 1, opacity: 0 }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
        />
      )}
    </AnimatePresence>
  );
}
