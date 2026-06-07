'use client';

/**
 * [LAYER: UI]
 */
import './styles/index.css';
import { HeroSection } from './components/HeroSection';
import { LandingMotionChrome } from './components/LandingMotionChrome';
import { LandingSectionBridge } from './components/LandingSectionBridge';
import { VendorsSection } from './components/VendorsSection';
import { VisitSection } from './components/VisitSection';
import { StudioShell } from './components/StudioShell';

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
