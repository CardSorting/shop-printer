'use client';

import { createContext, useContext, type ReactNode } from 'react';

const HomeVendorsReadyContext = createContext(false);

export function HomeVendorsReadyProvider({
  ready,
  children,
}: {
  ready: boolean;
  children: React.ReactNode;
}) {
  return <HomeVendorsReadyContext.Provider value={ready}>{children}</HomeVendorsReadyContext.Provider>;
}

export function useHomeVendorsReady() {
  return useContext(HomeVendorsReadyContext);
}
