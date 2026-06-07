/** Poster image → loop video under public/videos/landing/counters/ */
const COUNTER_VIDEO_BASENAMES = new Set([
  'counter-09',
  'counter-caracas',
  'counter-salt-city-bbq',
]);

export function getCounterVideoBasename(imgSrc: string): string {
  return imgSrc.replace(/^.*\//, '').replace(/\.[^.]+$/, '');
}

export function hasCounterVideo(imgSrc: string): boolean {
  return COUNTER_VIDEO_BASENAMES.has(getCounterVideoBasename(imgSrc));
}

export function getCounterVideoSrc(imgSrc: string): string {
  const basename = getCounterVideoBasename(imgSrc);
  return `/videos/landing/counters/${basename}.mp4`;
}
