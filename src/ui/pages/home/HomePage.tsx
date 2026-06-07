'use client';

/**
 * [LAYER: UI]
 */
import dynamic from 'next/dynamic';
import './styles/index.css';
import { HeroSection } from './components/HeroSection';
import { LandingSectionBridge } from './components/LandingSectionBridge';
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
      <StudioShell guided>
        <HeroSection />
        <LandingSectionBridge />
        <VendorsSection />
        <VisitSection />
      </StudioShell>
    </>
  );
}
