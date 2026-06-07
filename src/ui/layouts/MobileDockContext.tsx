'use client';

import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

type MobileDockContextValue = {
  chatOpen: boolean;
  setChatOpen: (open: boolean) => void;
};

const MobileDockContext = createContext<MobileDockContextValue | null>(null);

export function MobileDockProvider({ children }: { children: ReactNode }) {
  const [chatOpen, setChatOpen] = useState(false);

  const value = useMemo(
    () => ({ chatOpen, setChatOpen }),
    [chatOpen],
  );

  return <MobileDockContext.Provider value={value}>{children}</MobileDockContext.Provider>;
}

export function useMobileDock() {
  return useContext(MobileDockContext);
}
