'use client';

import Image from 'next/image';
import { useEffect, useRef } from 'react';
import { useReducedMotion } from 'framer-motion';
import { warmCounterVideo } from '../hooks/useCounterVideoWarmCache';
import { getCounterVideoSrc, hasCounterVideo } from '../utils/counterMedia';

type CounterHoverMediaProps = {
  img: string;
  alt: string;
  sizes: string;
  className?: string;
  imageClassName?: string;
  priority?: boolean;
  /** Preload video as soon as the grid is near the viewport */
  preloadVideo?: boolean;
  /** Preload immediately (hero tile) */
  eagerVideo?: boolean;
};

export function CounterHoverMedia({
  img,
  alt,
  sizes,
  className = '',
  imageClassName = '',
  priority = false,
  preloadVideo = false,
  eagerVideo = false,
}: CounterHoverMediaProps) {
  const reduceMotion = useReducedMotion();
  const stackRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hasVideo = hasCounterVideo(img);
  const videoSrc = getCounterVideoSrc(img);
  const shouldPreload = eagerVideo || preloadVideo;
  const useVideo = hasVideo && !reduceMotion;

  useEffect(() => {
    if (!useVideo || !shouldPreload) return;
    void warmCounterVideo(videoSrc);
  }, [shouldPreload, useVideo, videoSrc]);

  useEffect(() => {
    if (!useVideo) return;
    const stack = stackRef.current;
    const video = videoRef.current;
    if (!stack || !video) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          void video.play().catch(() => {});
          return;
        }

        video.pause();
      },
      { threshold: 0.2, rootMargin: '80px 0px' },
    );

    observer.observe(stack);
    return () => observer.disconnect();
  }, [useVideo]);

  return (
    <div ref={stackRef} className={`landing-counter-grid__media-stack ${className}`.trim()}>
      {useVideo ? (
        <video
          ref={videoRef}
          className={`landing-counter-grid__video object-cover ${imageClassName}`.trim()}
          src={videoSrc}
          poster={img}
          muted
          loop
          playsInline
          preload="auto"
          aria-label={alt}
        />
      ) : (
        <Image
          src={img}
          alt={alt}
          fill
          sizes={sizes}
          priority={priority}
          className={`landing-counter-grid__image object-cover ${imageClassName}`.trim()}
        />
      )}
    </div>
  );
}
