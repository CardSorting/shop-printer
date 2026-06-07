'use client';

/**
 * [LAYER: UI]
 */
import './styles/index.css';
import { HeroSection } from './components/HeroSection';
import { VendorsSection } from './components/VendorsSection';
import { VisitSection } from './components/VisitSection';
import { StudioShell } from './components/StudioShell';

export function HomePage() {
  return (
    <StudioShell>
      <HeroSection />
      <VendorsSection />
      <VisitSection />
    </StudioShell>
  );
}
