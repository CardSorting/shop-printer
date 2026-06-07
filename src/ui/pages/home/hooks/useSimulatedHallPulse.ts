'use client';

import { useEffect, useMemo, useState } from 'react';
import { SITE_HOURS_CLOSES, SITE_HOURS_OPENS } from '@utils/seo';
import { HALL_COUNTERS } from '../constants';
import { getHallDaypart, isHallOpenNow, parseHour, type HallDaypart } from '../utils/hallTime';

const TABLES_TOTAL = 24;

type UrgencyLevel = 'calm' | 'busy' | 'rush' | 'critical';

type DaypartRange = {
  guests: [number, number];
  ordersHour: [number, number];
  tableFill: [number, number];
  pickupQueue: [number, number];
  waitMins: [number, number];
  viewing: [number, number];
};

const DAYPART_RANGES: Record<HallDaypart, DaypartRange> = {
  morning: {
    guests: [18, 34],
    ordersHour: [6, 16],
    tableFill: [0.28, 0.48],
    pickupQueue: [1, 3],
    waitMins: [4, 9],
    viewing: [4, 14],
  },
  midday: {
    guests: [58, 96],
    ordersHour: [42, 78],
    tableFill: [0.68, 0.94],
    pickupQueue: [4, 9],
    waitMins: [8, 16],
    viewing: [18, 42],
  },
  afternoon: {
    guests: [34, 58],
    ordersHour: [22, 44],
    tableFill: [0.42, 0.68],
    pickupQueue: [2, 6],
    waitMins: [5, 11],
    viewing: [8, 22],
  },
  evening: {
    guests: [64, 102],
    ordersHour: [48, 86],
    tableFill: [0.72, 0.96],
    pickupQueue: [5, 10],
    waitMins: [9, 18],
    viewing: [22, 48],
  },
  late: {
    guests: [26, 48],
    ordersHour: [14, 32],
    tableFill: [0.38, 0.62],
    pickupQueue: [2, 5],
    waitMins: [6, 12],
    viewing: [6, 18],
  },
};

const ACTIVITY_VERBS = ['ordered', 'picked up', 'just sat down near', 'added to cart at'] as const;

export type SimulatedHallPulse = {
  guestsOnFloor: number;
  ordersLastHour: number;
  tablesTaken: number;
  tablesTotal: number;
  tablesLeft: number;
  tableFillPct: number;
  pickupQueue: number;
  lastOrderMins: number;
  lastOrderSeconds: number;
  pickupWaitMins: number;
  slotCountdownSeconds: number;
  viewingNow: number;
  hotWaits: Record<string, number>;
  stallCrowd: Record<string, number>;
  activityLine: string;
  opensInLabel: string | null;
  opensInSeconds: number;
  closesInLabel: string | null;
  closesInSeconds: number;
  rushLabel: string | null;
  urgencyLevel: UrgencyLevel;
  slotMaxSeconds: number;
};

function hashSeed(...parts: number[]): number {
  return parts.reduce((acc, n) => ((acc * 31 + n) | 0) >>> 0, 17);
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function lerpInt(min: number, max: number, t: number): number {
  return Math.round(min + (max - min) * t);
}

function sessionWave(now: Date, daypart: HallDaypart): number {
  const minutes = now.getHours() * 60 + now.getMinutes();
  const seed = hashSeed(now.getDate(), now.getMonth(), daypart.length);
  return (Math.sin(minutes / 19 + seed * 0.013) + 1) / 2;
}

function formatDuration(totalMins: number): string {
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  if (h <= 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function secondsUntil(time: string, now: Date, sameDayOnly = false): number {
  const target = parseHour(time);
  const current = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
  const targetSec = target * 60;
  if (sameDayOnly && current < targetSec) return targetSec - current;
  if (current < targetSec) return targetSec - current;
  return targetSec + 24 * 3600 - current;
}

function buildActivityLine(
  hotNames: readonly string[],
  lastOrderSeconds: number,
  tick: number,
  now: Date,
): string {
  const seed = hashSeed(tick, now.getMinutes(), hotNames.length);
  const counter = HALL_COUNTERS.find((c) => c.name === hotNames[seed % hotNames.length]);
  const variant = seed % 5;
  const ago = lastOrderSeconds < 60 ? `${lastOrderSeconds}s ago` : `${Math.floor(lastOrderSeconds / 60)}m ago`;

  if (!counter) return 'Walk-in just grabbed a shared table';

  switch (variant) {
    case 0:
      return `${counter.name} · ${counter.signature} ${ACTIVITY_VERBS[0]} ${ago}`;
    case 1:
      return `Pickup ready · ${counter.name} · ${counter.signature}`;
    case 2:
      return `Guest ${ACTIVITY_VERBS[2]} ${counter.name}`;
    case 3:
      return `${counter.cuisine} craving · ${counter.name} firing now`;
    default:
      return `Someone ${ACTIVITY_VERBS[3]} ${counter.name}`;
  }
}

function resolveUrgency(tablesLeft: number, tableFillPct: number, daypart: HallDaypart): UrgencyLevel {
  if (tablesLeft <= 3 || tableFillPct >= 92) return 'critical';
  if (tablesLeft <= 6 || tableFillPct >= 78 || daypart === 'midday' || daypart === 'evening') return 'rush';
  if (tableFillPct >= 55) return 'busy';
  return 'calm';
}

function buildStallCrowd(
  hotNames: readonly string[],
  daypart: HallDaypart,
  metricTick: number,
  secondTick: number,
): Record<string, number> {
  const hotSet = new Set(hotNames);

  return Object.fromEntries(
    HALL_COUNTERS.map((counter, index) => {
      const isHot = hotSet.has(counter.name);
      const seed = hashSeed(counter.name.length, index, metricTick, secondTick);
      let count = isHot ? 3 + (seed % 6) : 1 + (seed % 4);

      if (daypart === 'midday' || daypart === 'evening') {
        if (isHot) count += 2;
        else count += seed % 2;
      }

      if (daypart === 'morning' || daypart === 'late') {
        count = Math.max(1, count - 1);
      }

      return [counter.name, clamp(count, 1, 9)];
    }),
  );
}

function computePulse(
  now: Date,
  daypart: HallDaypart,
  hotNames: readonly string[],
  metricTick: number,
  secondTick: number,
  slotRemaining: number,
  slotMaxSeconds: number,
): SimulatedHallPulse {
  const open = isHallOpenNow(now);
  const range = DAYPART_RANGES[daypart];
  const wave = sessionWave(now, daypart);
  const seed = hashSeed(now.getDate(), daypart.charCodeAt(0), metricTick);

  const tablesTaken = lerpInt(
    Math.round(TABLES_TOTAL * range.tableFill[0]),
    Math.round(TABLES_TOTAL * range.tableFill[1]),
    wave,
  );
  const tablesLeft = Math.max(TABLES_TOTAL - tablesTaken, 0);
  const tableFillPct = Math.round((tablesTaken / TABLES_TOTAL) * 100);

  const guestsOnFloor = clamp(
    lerpInt(range.guests[0], range.guests[1], wave) + ((seed % 7) - 3),
    range.guests[0],
    range.guests[1] + 6,
  );

  const ordersLastHour = clamp(
    lerpInt(range.ordersHour[0], range.ordersHour[1], wave) + Math.floor(metricTick / 2),
    range.ordersHour[0],
    range.ordersHour[1] + 8,
  );

  const pickupQueue = clamp(
    lerpInt(range.pickupQueue[0], range.pickupQueue[1], wave) + (metricTick % 2),
    range.pickupQueue[0],
    range.pickupQueue[1] + 2,
  );

  const viewingNow = clamp(
    lerpInt(range.viewing[0], range.viewing[1], wave) + ((secondTick + seed) % 5) - 2,
    range.viewing[0],
    range.viewing[1] + 4,
  );

  const lastOrderSeconds = clamp(8 + ((secondTick * 7 + seed) % 52), 4, 59);
  const lastOrderMins = Math.max(1, Math.floor(lastOrderSeconds / 60) || 1);

  const slotCountdownSeconds = slotRemaining;
  const pickupWaitMins = lerpInt(range.waitMins[0], range.waitMins[1], wave) + (metricTick % 3);

  const hotWaits = Object.fromEntries(
    hotNames.map((name, i) => {
      const offset = hashSeed(name.length, i, metricTick) % 5;
      return [name, lerpInt(range.waitMins[0], range.waitMins[1], wave) + offset];
    }),
  );

  const opensInSeconds = secondsUntil(SITE_HOURS_OPENS ?? '11:00', now);
  const closesInSeconds = secondsUntil(SITE_HOURS_CLOSES ?? '22:00', now, true);

  const opensInLabel = open ? null : `Opens in ${formatDuration(Math.ceil(opensInSeconds / 60))}`;
  const closesInLabel =
    open && closesInSeconds <= 7200 ? `Counters slow in ${formatDuration(Math.ceil(closesInSeconds / 60))}` : null;

  const urgencyLevel = open ? resolveUrgency(tablesLeft, tableFillPct, daypart) : 'calm';

  const rushLabel =
    open && urgencyLevel === 'critical'
      ? `Only ${tablesLeft} tables left`
      : open && urgencyLevel === 'rush'
        ? `${tablesLeft} tables open · filling fast`
        : null;

  const activityLine = open
    ? buildActivityLine(hotNames, lastOrderSeconds, metricTick, now)
    : 'Hall opens soon · counters prepped · pastry case warming';

  const stallCrowd = buildStallCrowd(hotNames, daypart, metricTick, secondTick);

  return {
    guestsOnFloor,
    ordersLastHour,
    tablesTaken,
    tablesTotal: TABLES_TOTAL,
    tablesLeft,
    tableFillPct,
    pickupQueue,
    lastOrderMins,
    lastOrderSeconds,
    pickupWaitMins,
    slotCountdownSeconds: slotRemaining,
    slotMaxSeconds,
    viewingNow,
    hotWaits,
    stallCrowd,
    activityLine,
    opensInLabel,
    opensInSeconds,
    closesInLabel,
    closesInSeconds,
    rushLabel,
    urgencyLevel,
  };
}

export function useSimulatedHallPulse(hotNames: readonly string[]) {
  const [now, setNow] = useState(() => new Date());
  const [metricTick, setMetricTick] = useState(0);
  const [secondTick, setSecondTick] = useState(0);
  const [slotRemaining, setSlotRemaining] = useState(() => 48 + (hashSeed(new Date().getDate()) % 40));
  const [slotMaxSeconds, setSlotMaxSeconds] = useState(() => 48 + (hashSeed(new Date().getDate()) % 40));
  const daypart = getHallDaypart(now);
  const isOpen = isHallOpenNow(now);

  useEffect(() => {
    const id = window.setInterval(() => {
      setNow(new Date());
      setSecondTick((t) => t + 1);
      setSlotRemaining((s) => {
        if (s <= 1) {
          const next = 38 + (hashSeed(Date.now() % 100000) % 52);
          setSlotMaxSeconds(next);
          return next;
        }
        return s - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => setMetricTick((t) => t + 1), 8000);
    return () => window.clearInterval(id);
  }, []);

  const pulse = useMemo(
    () => computePulse(now, daypart, hotNames, metricTick, secondTick, slotRemaining, slotMaxSeconds),
    [now, daypart, hotNames, metricTick, secondTick, slotRemaining, slotMaxSeconds],
  );

  return { pulse, daypart, isOpen, metricTick, secondTick };
}
