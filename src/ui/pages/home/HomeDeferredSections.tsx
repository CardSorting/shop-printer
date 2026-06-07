'use client';

import dynamic from 'next/dynamic';
import { LandingSectionPlaceholder } from './components/LandingSectionPlaceholder';
import { useHomeVendorsReady } from './HomeDeferredContext';
import { useIdleOrNearViewport } from './hooks/useIdleOrNearViewport';

const VendorsSection = dynamic(
  () => import('./components/VendorsSection').then((m) => ({ default: m.VendorsSection })),
  { ssr: true },
);

const VisitSection = dynamic(
  () => import('./components/VisitSection').then((m) => ({ default: m.VisitSection })),
  { ssr: true },
);

export function HomeDeferredVendors() {
  const ready = useHomeVendorsReady();

  return ready ? (
    <VendorsSection />
  ) : (
    <LandingSectionPlaceholder minHeight="min(88svh, 44rem)" id="landing-vendors" />
  );
}

export function HomeDeferredVisit() {
  const vendorsReady = useHomeVendorsReady();
  const { ref, active } = useIdleOrNearViewport({
    rootMargin: '640px 0px',
    idleFallback: false,
    enabled: vendorsReady,
  });

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
