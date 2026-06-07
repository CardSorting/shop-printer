'use client';

import { useRef } from 'react';
import Link from 'next/link';
import { motion, useScroll, useTransform } from 'framer-motion';
import { ArrowUpRight, Car, MapPin, Navigation } from 'lucide-react';
import { STAGGER_CONTAINER_VARIANTS } from '@ui/animations';
import { WOODBINE_LOCAL_BUSINESS_DEFAULTS } from '@domain/seo/local-business-defaults';
import { LANDING_COPY } from '../copy';
import {
  PARALLAX_SPRING,
  useScrollVelocityBlur,
} from '../hooks/useParallax';
import { useSmoothProgress } from '../hooks/useSmoothProgress';
import { getMapsEmbedUrl, getMapsSearchUrl } from '../utils/hallMaps';
import { HoverLink, HoverLift, InfoRow } from './MicroMotion';
import { ElementPointerSurface } from './PointerMotionSurfaces';
import { ParallaxMotion } from './ParallaxMotion';
import { PointerTiltSurface } from './PointerMotionSurfaces';
import { SITE_GEO_LAT, SITE_GEO_LNG, SITE_STREET, SITE_LOCALITY, SITE_REGION } from '@utils/seo';

const { gettingHere } = LANDING_COPY;

const street = SITE_STREET ?? WOODBINE_LOCAL_BUSINESS_DEFAULTS.street;
const locality = SITE_LOCALITY ?? WOODBINE_LOCAL_BUSINESS_DEFAULTS.city;
const region = SITE_REGION ?? WOODBINE_LOCAL_BUSINESS_DEFAULTS.region;
const addressLine = `${street}, ${locality}, ${region}`;

const ROUTE_ROWS = [
  { icon: MapPin, label: gettingHere.address.label, detail: addressLine },
  { icon: Car, label: gettingHere.parking.label, detail: gettingHere.parking.detail },
  { icon: Navigation, label: gettingHere.arrival.label, detail: gettingHere.arrival.detail },
] as const;

const ROW_VARIANTS = {
  initial: { opacity: 0, x: -16 },
  animate: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.55, ease: [0.16, 1, 0.3, 1] as const },
  },
};

export function HallGettingHere() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start end', 'end start'],
  });
  const smooth = useSmoothProgress(scrollYProgress, PARALLAX_SPRING.ambient);
  const mapVelocityBlur = useScrollVelocityBlur(smooth, 2);

  const headerY = useTransform(smooth, [0, 1], ['5%', '-4%']);
  const headlineClip = useTransform(smooth, [0.06, 0.28], ['inset(100% 0 0 0 round 2px)', 'inset(0% 0 0 0 round 2px)']);
  const ruleScale = useTransform(smooth, [0.12, 0.32], [0, 1]);
  const subY = useTransform(smooth, [0.08, 0.35], ['1.25rem', '0rem']);
  const subOpacity = useTransform(smooth, [0.08, 0.28], [0, 1]);
  const asideY = useTransform(smooth, [0.12, 0.38], ['1rem', '0rem']);
  const asideOpacity = useTransform(smooth, [0.12, 0.32], [0, 1]);
  const glowOpacity = useTransform(smooth, [0, 0.45, 1], [0, 0.42, 0.18]);
  const glowY = useTransform(smooth, [0, 1], ['-8%', '10%']);
  const mapY = useTransform(smooth, [0, 0.5, 1], ['6%', '-1%', '-8%']);
  const mapScale = useTransform(smooth, [0, 0.5, 1], [0.94, 1, 1.05]);
  const mapTiltY = useTransform(smooth, [0, 1], ['-2.5deg', '2.5deg']);
  const mapInnerY = useTransform(smooth, [0, 1], ['-5%', '7%']);
  const mapFrameOpacity = useTransform(smooth, [0.2, 0.55, 0.85], [0, 0.55, 0.2]);
  const pinY = useTransform(smooth, [0, 1], ['0%', '-14%']);
  const pinX = useTransform(smooth, [0, 1], ['-3%', '3%']);
  const captionY = useTransform(smooth, [0, 1], ['2%', '-3%']);
  const detailsY = useTransform(smooth, [0, 1], ['-5%', '6%']);
  const detailsX = useTransform(smooth, [0, 1], ['4%', '-5%']);
  const detailsTiltX = useTransform(smooth, [0, 1], ['1.5deg', '-1.5deg']);
  const endingFadeOpacity = useTransform(smooth, [0.72, 0.92, 1], [0, 0.55, 0.85]);

  const mapsUrl = getMapsSearchUrl(street, locality, region, SITE_GEO_LAT, SITE_GEO_LNG);
  const embedUrl = getMapsEmbedUrl(SITE_GEO_LAT, SITE_GEO_LNG);

  return (
    <motion.div
      ref={sectionRef}
      className="landing-getting-here hall-glass landing-parallax-scene"
      aria-labelledby="getting-here-heading"
    >
      <ParallaxMotion
        modes={['shift-y', 'fade']}
        y={glowY}
        opacity={glowOpacity}
        className="landing-getting-here__glow"
        aria-hidden
      />

      <ParallaxMotion modes={['shift-y']} y={headerY}>
        <header className="landing-getting-here__header">
          <div className="landing-getting-here__header-top">
            <p className="landing-getting-here__label">{gettingHere.label}</p>
            <span className="hall-badge">{gettingHere.stamp}</span>
          </div>
          <ParallaxMotion modes={['shift-y', 'clip']} clipPath={headlineClip}>
          <h3 id="getting-here-heading" className="landing-getting-here__headline font-display">
            {gettingHere.headline}
          </h3>
          </ParallaxMotion>
          <ParallaxMotion modes={['scale-x']} scaleX={ruleScale} className="hall-rule landing-getting-here__rule" aria-hidden />
          <ParallaxMotion modes={['shift-y', 'fade']} y={subY} opacity={subOpacity}>
            <p className="landing-getting-here__sub">{gettingHere.sub}</p>
          </ParallaxMotion>
          <ParallaxMotion modes={['shift-y', 'fade']} y={asideY} opacity={asideOpacity}>
            <p className="landing-getting-here__aside">{gettingHere.aside}</p>
          </ParallaxMotion>
        </header>
      </ParallaxMotion>

      <div className="landing-getting-here__layout">
        <HoverLift
          className="landing-getting-here__map-col"
          lift={-3}
          initial={{ opacity: 0, y: 32, scale: 0.98 }}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.75, delay: 0.12, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="landing-getting-here__map-scene">
          <ParallaxMotion modes={['transform']} y={mapY} scale={mapScale} rotateY={mapTiltY} className="landing-getting-here__map-wrap">
            <ElementPointerSurface
              className="landing-getting-here__map-bounds"
              innerClassName="landing-getting-here__map-tilt"
              strength={4}
              stiffness={80}
              damping={14}
            >
            <ParallaxMotion
              modes={['transform', 'filter']}
              y={mapInnerY}
              filter={mapVelocityBlur}
              className="landing-getting-here__map-inner"
            >
              <iframe
                title={`Map showing WoodBine at ${addressLine}`}
                src={embedUrl}
                className="landing-getting-here__map"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                allowFullScreen
              />
            </ParallaxMotion>
            <ParallaxMotion
              modes={['fade']}
              opacity={mapFrameOpacity}
              className="landing-getting-here__map-frame"
              aria-hidden
            />
            <ParallaxMotion modes={['transform']} x={pinX} y={pinY} className="landing-getting-here__map-pin" aria-hidden>
              <span className="landing-getting-here__map-pin-dot" />
              <span className="landing-getting-here__map-pin-label">WoodBine</span>
            </ParallaxMotion>
            <HoverLink className="landing-getting-here__map-cta-wrap">
            <Link
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="landing-getting-here__map-cta"
            >
              {gettingHere.mapsCta}
              <span className="landing-getting-here__map-cta-icon" aria-hidden>
                <ArrowUpRight className="h-3.5 w-3.5" />
              </span>
            </Link>
            </HoverLink>
            </ElementPointerSurface>
            </ParallaxMotion>
          </div>
          <ParallaxMotion modes={['shift-y']} y={captionY}>
            <p className="landing-getting-here__map-caption">{gettingHere.mapCaption}</p>
          </ParallaxMotion>
        </HoverLift>

        <ParallaxMotion modes={['transform']} x={detailsX} y={detailsY} rotateX={detailsTiltX} className="landing-getting-here__details">
          <PointerTiltSurface className="landing-getting-here__details-inner" maxRotate={3.5}>
          <p className="landing-getting-here__route-kicker">{gettingHere.routeKicker}</p>
          <p className="landing-getting-here__eta">{gettingHere.marginNote}</p>

          <motion.ul
            className="landing-getting-here__list"
            initial="initial"
            whileInView="animate"
            viewport={{ once: true, margin: '-20px' }}
            variants={STAGGER_CONTAINER_VARIANTS}
          >
            {ROUTE_ROWS.map((row, index) => {
              const Icon = row.icon;

              return (
                <InfoRow
                  key={row.label}
                  icon={<Icon className="h-4 w-4 shrink-0" aria-hidden />}
                  label={row.label}
                  detail={row.detail}
                  variants={ROW_VARIANTS}
                  transition={{ delay: index * 0.07 }}
                  progress={smooth}
                  parallaxIndex={index}
                />
              );
            })}
          </motion.ul>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
          >
          <HoverLink className="landing-getting-here__directions-wrap">
            <Link href={mapsUrl} target="_blank" rel="noopener noreferrer" className="landing-getting-here__directions">
              {gettingHere.directionsLabel}
              <span aria-hidden className="landing-getting-here__directions-icon">
                <ArrowUpRight className="h-3.5 w-3.5" />
              </span>
            </Link>
          </HoverLink>
          </motion.div>
          </PointerTiltSurface>
        </ParallaxMotion>
      </div>

      <ParallaxMotion
        modes={['fade']}
        opacity={endingFadeOpacity}
        className="landing-getting-here__ending-fade"
        aria-hidden
      />
    </motion.div>
  );
}
