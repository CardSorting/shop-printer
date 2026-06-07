'use client';

import { useEffect, useState } from 'react';

/** True when the document tab is visible — use to pause intervals/animations */
export function usePageVisible() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const sync = () => setVisible(document.visibilityState === 'visible');
    sync();
    document.addEventListener('visibilitychange', sync);
    return () => document.removeEventListener('visibilitychange', sync);
  }, []);

  return visible;
}
