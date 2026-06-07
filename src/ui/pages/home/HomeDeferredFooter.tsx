'use client';

import dynamic from 'next/dynamic';
import { useIdleOrNearViewport } from './hooks/useIdleOrNearViewport';

const Footer = dynamic(
  () => import('@ui/layouts/Footer').then((m) => ({ default: m.Footer })),
  { ssr: true },
);

export function HomeDeferredFooter() {
  const { ref, active } = useIdleOrNearViewport({ rootMargin: '320px 0px', idleFallback: false });

  return (
    <>
      <div ref={ref} className="landing-below-fold-sentinel" aria-hidden />
      {active ? (
        <Footer />
      ) : (
        <footer className="landing-footer-placeholder landing-section-deferred" aria-hidden />
      )}
    </>
  );
}
