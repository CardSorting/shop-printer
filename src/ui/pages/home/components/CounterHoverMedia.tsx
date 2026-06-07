'use client';

import Image from 'next/image';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import { warmCounterVideo } from '../hooks/useCounterVideoWarmCache';
import { getCounterVideoSrc } from '../utils/counterMedia';

type CounterHoverMediaProps = {
  img: string;
  alt: string;
  sizes: string;
  className?: string;
  imageClassName?: string;
  priority?: boolean;
  /** Preload hover video as soon as the grid is near the viewport */
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
  const videoRef = useRef<HTMLVideoElement>(null);
  const [canHover, setCanHover] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const videoSrc = getCounterVideoSrc(img);
  const shouldPreload = eagerVideo || preloadVideo;

  useEffect(() => {
    setCanHover(window.matchMedia('(hover: hover) and (pointer: fine)').matches);
  }, []);

  useEffect(() => {
    if (reduceMotion || !shouldPreload || videoFailed) return;
    void warmCounterVideo(videoSrc).catch(() => setVideoFailed(true));
  }, [reduceMotion, shouldPreload, videoFailed, videoSrc]);

  const startVideo = useCallback(() => {
    if (reduceMotion || !canHover || videoFailed) return;
    const video = videoRef.current;
    if (!video) return;

    const play = () => {
      video.currentTime = 0;
      void video
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => setVideoFailed(true));
    };

    if (video.readyState >= 2) {
      play();
      return;
    }

    void warmCounterVideo(videoSrc)
      .then(play)
      .catch(() => setVideoFailed(true));
  }, [canHover, reduceMotion, videoFailed, videoSrc]);

  const stopVideo = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.pause();
    setIsPlaying(false);
  }, []);

  const showVideo = canHover && !reduceMotion && !videoFailed;

  return (
    <div
      className={`landing-counter-grid__media-stack ${className}`.trim()}
      onMouseEnter={startVideo}
      onMouseLeave={stopVideo}
      onFocus={startVideo}
      onBlur={stopVideo}
    >
      <Image
        src={img}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        className={`landing-counter-grid__image object-cover${isPlaying && videoReady ? ' landing-counter-grid__image--hidden' : ''} ${imageClassName}`.trim()}
      />
      {showVideo && (
        <video
          ref={videoRef}
          className={`landing-counter-grid__video object-cover${isPlaying && videoReady ? ' landing-counter-grid__video--active' : ''}`}
          src={videoSrc}
          poster={img}
          muted
          loop
          playsInline
          preload={shouldPreload ? 'auto' : 'metadata'}
          onLoadedData={() => setVideoReady(true)}
          onError={() => setVideoFailed(true)}
          aria-hidden
        />
      )}
    </div>
  );
}
