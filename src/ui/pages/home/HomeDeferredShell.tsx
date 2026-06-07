'use client';

import type { ReactNode } from 'react';
import { HomeVendorsReadyProvider } from './HomeDeferredContext';
import { useIdleOrNearViewport } from './hooks/useIdleOrNearViewport';

/** Shared vendors gate — sentinel lives before the first below-fold section */
export function HomeDeferredShell({ children }: { children: ReactNode }) {
  const { ref, active } = useIdleOrNearViewport();

  return (
    <HomeVendorsReadyProvider ready={active}>
      <div ref={ref} className="landing-below-fold-sentinel" aria-hidden />
      {children}
    </HomeVendorsReadyProvider>
  );
}
