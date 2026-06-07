'use client';

import { useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useScroll, useTransform } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';
import { DEFAULT_BLOG_IMAGE } from '@utils/imageFallback';
import { LANDING_COPY } from '../copy';
import { useSmoothProgress } from '../hooks/useSmoothProgress';
import { ParallaxMotion } from './ParallaxMotion';

const { editorial } = LANDING_COPY;

export function EditorialBreak() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start start', 'end end'],
  });
  const smooth = useSmoothProgress(scrollYProgress, 70, 24);

  const imageY = useTransform(smooth, [0, 1], ['-18%', '18%']);
  const imageScale = useTransform(smooth, [0, 0.5, 1], [1.28, 1.02, 1.28]);
  const imageRotate = useTransform(smooth, [0, 1], [-2, 2]);
  const textY = useTransform(smooth, [0, 1], ['22%', '-22%']);
  const textOpacity = useTransform(smooth, [0, 0.15, 0.85, 1], [0.15, 1, 1, 0.15]);
  const subY = useTransform(smooth, [0, 1], ['30%', '-10%']);
  const lineScale = useTransform(smooth, [0.15, 0.45], [0, 1]);

  return (
    <section id="landing-editorial" ref={ref} className="landing-editorial landing-editorial--pin">
      <div className="landing-editorial__pin">
        <ParallaxMotion
          modes={['transform']}
          y={imageY}
          scale={imageScale}
          rotate={imageRotate}
          className="landing-editorial__media grain-overlay"
        >
          <Image
            src={DEFAULT_BLOG_IMAGE}
            alt="Guests gathered at shared tables in the WoodBine hall"
            fill
            sizes="100vw"
            className="object-cover"
          />
          <div className="landing-editorial__scrim" />
        </ParallaxMotion>

        <ParallaxMotion
          modes={['shift-y', 'fade']}
          y={textY}
          opacity={textOpacity}
          className="landing-editorial__content"
        >
          <p className="landing-editorial__kicker">{editorial.kicker}</p>
          <p className="landing-editorial__quote font-display">{editorial.quote}</p>
          <ParallaxMotion modes={['scale-x']} scaleX={lineScale} className="landing-editorial__rule" />
          <ParallaxMotion as="p" modes={['shift-y']} y={subY} className="landing-editorial__sub">
            {editorial.sub}
          </ParallaxMotion>

          <ul className="landing-editorial__senses" aria-label="Sensory atmosphere">
            {editorial.senses.map((sense) => (
              <li key={sense}>{sense}</li>
            ))}
          </ul>

          <Link href={editorial.cta.href} className="landing-editorial__cta group">
            <span>{editorial.cta.label}</span>
            <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </Link>
        </ParallaxMotion>

        <div className="landing-editorial__edge landing-editorial__edge--left" aria-hidden />
        <div className="landing-editorial__edge landing-editorial__edge--right" aria-hidden />
        <div className="landing-editorial__frame" aria-hidden />
      </div>
    </section>
  );
}
