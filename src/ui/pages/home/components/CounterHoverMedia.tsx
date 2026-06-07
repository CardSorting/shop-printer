'use client';

import { useCallback, useRef } from 'react';
import Image from 'next/image';
import { warmCounterVideo } from '../hooks/useCounterVideoWarmCache';
import { useMinViewportWidth } from '../hooks/useMinViewportWidth';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';
import { getCounterVideoSrc, hasCounterVideo } from '../utils/counterMedia';

type CounterHoverMediaProps = {
  img: string;
  alt: string;
  sizes: string;
  className?: string;
  imageClassName?: string;
  priority?: boolean;
};

export function CounterHoverMedia({
  img,
  alt,
  sizes,
  className = '',
  imageClassName = '',
  priority = false,
}: CounterHoverMediaProps) {
  const reduceMotion = usePrefersReducedMotion();
  const desktop = useMinViewportWidth(768);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hasVideo = hasCounterVideo(img);
  const videoSrc = getCounterVideoSrc(img);
  const useVideo = hasVideo && !reduceMotion && desktop;

  const onPointerEnter = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    void warmCounterVideo(videoSrc);
    void video.play().catch(() => {});
  }, [videoSrc]);

  const onPointerLeave = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.pause();
    video.currentTime = 0;
  }, []);

  return (
    <div
      className={`landing-counter-grid__media-stack ${className}`.trim()}
      onPointerEnter={useVideo ? onPointerEnter : undefined}
      onPointerLeave={useVideo ? onPointerLeave : undefined}
    >
      {useVideo ? (
        <video
          ref={videoRef}
          className={`landing-counter-grid__video object-cover ${imageClassName}`.trim()}
          src={videoSrc}
          poster={img}
          muted
          loop
          playsInline
          preload="none"
          aria-label={alt}
        />
      ) : (
        <Image
          src={img}
          alt={alt}
          fill
          sizes={sizes}
          quality={68}
          priority={priority}
          loading={priority ? undefined : 'lazy'}
          className={`landing-counter-grid__image object-cover ${imageClassName}`.trim()}
        />
      )}
    </div>
  );
}
