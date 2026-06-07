'use client';

import { useEffect, useState } from 'react';
import { usePageVisible } from './usePageVisible';
import { getHallDaypart, isHallOpenNow, type HallDaypart } from '../utils/hallTime';

export function useHallDaypart(pollMs = 120_000) {
  const [daypart, setDaypart] = useState<HallDaypart>(() => getHallDaypart());
  const [isOpen, setIsOpen] = useState<boolean | null>(() => isHallOpenNow());
  const pageVisible = usePageVisible();

  useEffect(() => {
    if (!pageVisible) return;

    const tick = () => {
      setDaypart(getHallDaypart());
      setIsOpen(isHallOpenNow());
    };
    tick();
    const id = window.setInterval(tick, pollMs);
    return () => window.clearInterval(id);
  }, [pollMs, pageVisible]);

  return { daypart, isOpen };
}
