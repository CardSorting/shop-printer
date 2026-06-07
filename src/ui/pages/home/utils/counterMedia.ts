/** Poster image → hover loop video under public/videos/landing/counters/ */
export function getCounterVideoSrc(imgSrc: string): string {
  const basename = imgSrc.replace(/^.*\//, '').replace(/\.[^.]+$/, '');
  return `/videos/landing/counters/${basename}.mp4`;
}

export function getCounterVideoBasename(imgSrc: string): string {
  return imgSrc.replace(/^.*\//, '').replace(/\.[^.]+$/, '');
}
