'use client';

import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { SLIDE_UP_VARIANTS } from '@ui/animations';
import { LANDING_COPY } from '../copy';
import { CounterDirectory } from './CounterDirectory';
import { HallCta } from './HallCta';
import { SectionLabel, StudioContainer, StudioHeading } from './StudioShell';

const { vendors } = LANDING_COPY;

export function VendorsSection() {
  return (
    <section id="landing-vendors" className="landing-vendors landing-vendors--hall grain-overlay">
      <StudioContainer>
        <motion.div
          initial="initial"
          whileInView="animate"
          viewport={{ once: true, margin: '-60px' }}
          variants={SLIDE_UP_VARIANTS}
          className="landing-vendors__header landing-vendors__header--simple"
        >
          <div>
            <SectionLabel label={vendors.label} dark />
            <StudioHeading size="display" className="landing-vendors__title">
              {vendors.headline[0]}
              <span className="landing-heading__accent-light">{vendors.headline[1]}</span>
            </StudioHeading>
            <p className="landing-vendors__lede landing-vendors__lede--inline">{vendors.lede}</p>
          </div>
          <HallCta
            href={vendors.cta.href}
            label={vendors.cta.label}
            variant="primary"
            dark
            className="landing-vendors__cta"
            icon={<ArrowRight className="h-4 w-4" />}
          />
        </motion.div>

        <CounterDirectory />
      </StudioContainer>
    </section>
  );
}
