import './styles/home-page.css';
import { HeroSection } from './components/HeroSection';
import { HomeDeferredVendors, HomeDeferredVisit } from './HomeDeferredSections';
import { LandingMotionChrome } from './components/LandingMotionChrome';
import { LandingSectionBridge } from './components/LandingSectionBridge';
import { LandingSceneCut } from './components/LandingSceneCut';
import { StudioShell } from './components/StudioShell';

export function HomePage() {
  return (
    <>
      <HeroSection />
      <LandingMotionChrome />
      <StudioShell guided cinematic>
        <LandingSectionBridge />
        <LandingSceneCut
          from="01"
          to="02"
          title="The counters"
          subtitle="Nine kitchens · one wall · mix whatever you want"
        />
        <HomeDeferredVendors />
        <LandingSceneCut
          from="02"
          to="03"
          title="Plan your visit"
          subtitle="Hours · events · directions — everything before you walk in"
        />
        <HomeDeferredVisit />
      </StudioShell>
    </>
  );
}
