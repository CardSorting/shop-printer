'use client';

import { useEffect, useState } from 'react';
import { getHallDaypart, isHallOpenNow, type HallDaypart } from '../utils/hallTime';

export function useHallDaypart(pollMs = 60_000) {
  const [daypart, setDaypart] = useState<HallDaypart>('midday');
  const [isOpen, setIsOpen] = useState<boolean | null>(null);

  useEffect(() => {
    const tick = () => {
      setDaypart(getHallDaypart());
      setIsOpen(isHallOpenNow());
    };
    tick();
    const id = window.setInterval(tick, pollMs);
    return () => window.clearInterval(id);
  }, [pollMs]);

  return { daypart, isOpen };
}
