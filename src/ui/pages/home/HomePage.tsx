'use client';

/**
 * [LAYER: UI]
 */
import dynamic from 'next/dynamic';
import './styles/index.css';
import { HeroSection } from './components/HeroSection';
import { LandingSectionBridge } from './components/LandingSectionBridge';
import { LandingSceneCut } from './components/LandingSceneCut';
import { VendorsSection } from './components/VendorsSection';
import { StudioShell } from './components/StudioShell';

const LandingMotionChrome = dynamic(
  () => import('./components/LandingMotionChrome').then((m) => ({ default: m.LandingMotionChrome })),
  { ssr: true },
);

const VisitSection = dynamic(
  () => import('./components/VisitSection').then((m) => ({ default: m.VisitSection })),
  { ssr: true },
);

export function HomePage() {
  return (
    <>
      <LandingMotionChrome />
      <StudioShell guided cinematic>
        <HeroSection />
        <LandingSectionBridge />
        <LandingSceneCut
          from="01"
          to="02"
          title="The counters"
          subtitle="Nine kitchens · one wall · mix whatever you want"
        />
        <VendorsSection />
        <LandingSceneCut
          from="02"
          to="03"
          title="Plan your visit"
          subtitle="Hours · events · directions — everything before you walk in"
        />
        <VisitSection />
      </StudioShell>
    </>
  );
}
