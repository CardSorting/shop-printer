'use client';

import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import { SLIDE_UP_VARIANTS } from '@ui/animations';
import { LANDING_COPY } from '../copy';
import { VENDOR_TILES } from '../constants';
import { useSectionParallax, useParallaxY, useParallaxX } from '../hooks/useParallax';
import { AgencyCta, AgencyFrame, AgencyGrid, AgencyStamp, SectionWatermark, useSmoothProgress } from './AgencyChrome';
import { ParallaxLayer } from './ParallaxLayer';
import { ParallaxMotion } from './ParallaxMotion';
import { SectionLabel, StudioContainer, StudioHeading } from './StudioShell';

const { vendors } = LANDING_COPY;
const PARALLAX_SPEEDS: [number, number][] = [
  [14, -18],
  [24, -28],
  [10, -14],
];

export function VendorsSection() {
  const { ref, scrollYProgress } = useSectionParallax();
  const smooth = useSmoothProgress(scrollYProgress);
  const gridY = useParallaxY(smooth, [3, -3]);
  const headerX = useParallaxX(smooth, [-4, 4]);

  return (
    <section id="landing-vendors" ref={ref} className="landing-vendors landing-vendors--agency landing-vendors--iv grain-overlay">
      <SectionWatermark index={vendors.index} dark parallaxY={gridY} />
      <div className="landing-vendors__pattern hero-pattern" aria-hidden />
      <AgencyGrid parallaxY={gridY} className="landing-vendors__grid-overlay" />
      <AgencyStamp coords="SLC · UT" dark className="landing-vendors__stamp" />

      <StudioContainer>
        <ParallaxMotion modes={['shift-x']} x={headerX}>
          <motion.div
            initial="initial"
            whileInView="animate"
            viewport={{ once: true, margin: '-60px' }}
            variants={SLIDE_UP_VARIANTS}
            className="landing-vendors__header"
          >
          <div>
            <SectionLabel index={vendors.index} label={vendors.label} dark />
            <StudioHeading size="display" className="landing-vendors__title">
              {vendors.headline[0]}
              <span className="landing-heading__accent-light">{vendors.headline[1]}</span>
            </StudioHeading>
          </div>
          <div className="landing-vendors__header-aside">
            <p className="landing-vendors__lede">{vendors.lede}</p>
            <AgencyCta
              href={vendors.cta.href}
              label={vendors.cta.label}
              variant="magnetic"
              className="landing-vendors__cta"
              index="04"
              icon={<ArrowRight className="h-4 w-4" />}
            />
          </div>
          </motion.div>
        </ParallaxMotion>

        <div className="landing-vendors__bento">
          {VENDOR_TILES.map((tile, i) => {
            const copy = vendors.tiles[i];
            const yRange = PARALLAX_SPEEDS[i] ?? [8, -8];

            return (
              <motion.div
                key={tile.href}
                initial={{ opacity: 0, y: 48 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.85, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
                className={`landing-vendors__tile ${tile.span}`}
              >
                <ParallaxLayer progress={smooth} y={yRange}>
                  <Link href={tile.href} className="landing-vendors__link group">
                    <AgencyFrame className="landing-vendors__frame-wrap">
                      <div className={`landing-vendors__frame image-frame ${tile.aspect}`}>
                      <Image
                        src={tile.img}
                        fill
                        sizes="(max-width: 768px) 100vw, 40vw"
                        className="object-cover transition-transform duration-[2s] ease-out group-hover:scale-[1.06]"
                        alt={`${copy.title} — ${copy.sub}`}
                      />
                      <div className="landing-vendors__frame-scrim" />
                      <span className="landing-vendors__index font-display">{tile.index}</span>
                      <div className="landing-vendors__frame-copy">
                        <p className="landing-vendors__frame-sub">{copy.sub}</p>
                        <div className="landing-vendors__frame-row">
                          <h3 className="landing-vendors__frame-title font-display">{copy.title}</h3>
                          <span className="landing-vendors__frame-btn">
                            <ArrowUpRight className="h-4 w-4" />
                          </span>
                        </div>
                      </div>
                      </div>
                    </AgencyFrame>
                  </Link>
                </ParallaxLayer>
              </motion.div>
            );
          })}
        </div>
      </StudioContainer>
    </section>
  );
}
