import { getCounterVideoSrc, hasCounterVideo } from '../utils/counterMedia';

const warmCache = new Map<string, Promise<void>>();
const failedCache = new Set<string>();

export function warmCounterVideo(src: string): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (failedCache.has(src)) return Promise.resolve();

  const existing = warmCache.get(src);
  if (existing) return existing;

  const promise = new Promise<void>((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'auto';
    video.muted = true;
    video.playsInline = true;
    video.src = src;

    const finish = () => resolve();
    const fail = () => {
      failedCache.add(src);
      warmCache.delete(src);
      reject(new Error(`Failed to warm ${src}`));
    };

    video.addEventListener('canplay', finish, { once: true });
    video.addEventListener('error', fail, { once: true });
    video.load();
  });

  warmCache.set(src, promise);
  return promise;
}

export function prefetchCounterVideoLink(src: string) {
  if (typeof document === 'undefined') return;
  if (failedCache.has(src)) return;
  if (document.querySelector(`link[data-counter-video="${src}"]`)) return;
  const link = document.createElement('link');
  link.rel = 'prefetch';
  link.as = 'video';
  link.href = src;
  link.setAttribute('data-counter-video', src);
  document.head.appendChild(link);
}

export function warmAllCounterVideos(imgSources: string[]) {
  imgSources.forEach((imgSrc) => {
    if (!hasCounterVideo(imgSrc)) return;
    const src = getCounterVideoSrc(imgSrc);
    prefetchCounterVideoLink(src);
    void warmCounterVideo(src);
  });
}
