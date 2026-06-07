const warmCache = new Map<string, Promise<void>>();

export function warmCounterVideo(src: string): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  const existing = warmCache.get(src);
  if (existing) return existing;

  const promise = new Promise<void>((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'auto';
    video.muted = true;
    video.playsInline = true;
    video.src = src;

    const finish = () => resolve();
    const fail = () => reject(new Error(`Failed to warm ${src}`));

    video.addEventListener('canplaythrough', finish, { once: true });
    video.addEventListener('error', fail, { once: true });
    video.load();
  }).catch(() => {
    warmCache.delete(src);
  });

  warmCache.set(src, promise);
  return promise;
}

export function prefetchCounterVideoLink(src: string) {
  if (typeof document === 'undefined') return;
  if (document.querySelector(`link[data-counter-video="${src}"]`)) return;
  const link = document.createElement('link');
  link.rel = 'prefetch';
  link.as = 'video';
  link.href = src;
  link.setAttribute('data-counter-video', src);
  document.head.appendChild(link);
}

export function warmAllCounterVideos(sources: string[]) {
  sources.forEach((src) => {
    prefetchCounterVideoLink(src);
    void warmCounterVideo(src);
  });
}
