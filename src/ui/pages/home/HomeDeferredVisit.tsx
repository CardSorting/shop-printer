'use client';

import dynamic from 'next/dynamic';
import { LandingSectionPlaceholder } from './components/LandingSectionPlaceholder';
import { useIdleOrNearViewport } from './hooks/useIdleOrNearViewport';

const VisitSection = dynamic(
  () => import('./components/VisitSection').then((m) => ({ default: m.VisitSection })),
  { ssr: true },
);

export function HomeDeferredVisit() {
  const { ref, active } = useIdleOrNearViewport({ rootMargin: '640px 0px', idleFallback: false });

  return (
    <>
      <div ref={ref} className="landing-below-fold-sentinel" aria-hidden />
      {active ? (
        <VisitSection />
      ) : (
        <LandingSectionPlaceholder minHeight="min(120svh, 52rem)" id="landing-visit" />
      )}
    </>
  );
}
