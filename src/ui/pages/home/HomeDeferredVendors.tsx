'use client';

import dynamic from 'next/dynamic';
import { LandingSectionPlaceholder } from './components/LandingSectionPlaceholder';
import { useIdleOrNearViewport } from './hooks/useIdleOrNearViewport';

const VendorsSection = dynamic(
  () => import('./components/VendorsSection').then((m) => ({ default: m.VendorsSection })),
  { ssr: true },
);

export function HomeDeferredVendors() {
  const { ref, active } = useIdleOrNearViewport();

  return (
    <>
      <div ref={ref} className="landing-below-fold-sentinel" aria-hidden />
      {active ? (
        <VendorsSection />
      ) : (
        <LandingSectionPlaceholder minHeight="min(88svh, 44rem)" id="landing-vendors" />
      )}
    </>
  );
}
