import { SITE_HOURS_CLOSES, SITE_HOURS_OPENS } from '@utils/seo';

export function parseHour(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + (m ?? 0);
}

export function formatHourLabel(time: string): string {
  const [hStr, mStr] = time.split(':');
  const h = Number(hStr);
  const m = Number(mStr ?? 0);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 || 12;
  return m === 0 ? `${hour12} ${period}` : `${hour12}:${String(m).padStart(2, '0')} ${period}`;
}

export function formatHoursRange(opens: string, closes: string): string {
  return `${formatHourLabel(opens)} – ${formatHourLabel(closes)} daily`;
}

export function isHallOpenNow(now = new Date()): boolean {
  const minutes = now.getHours() * 60 + now.getMinutes();
  const opens = parseHour(SITE_HOURS_OPENS ?? '11:00');
  const closes = parseHour(SITE_HOURS_CLOSES ?? '22:00');
  return minutes >= opens && minutes < closes;
}

export type HallDaypart = 'morning' | 'midday' | 'afternoon' | 'evening' | 'late';

export function getHallDaypart(now = new Date()): HallDaypart {
  const h = now.getHours();
  if (h < 11) return 'morning';
  if (h < 14) return 'midday';
  if (h < 17) return 'afternoon';
  if (h < 21) return 'evening';
  return 'late';
}
