'use client';

import { motion } from '../motion';
import { SLIDE_UP_VARIANTS } from '@ui/animations';
import { HallCta } from './HallCta';
import { HoverLift } from './MicroMotion';
import { LANDING_COPY } from '../copy';

const { closing } = LANDING_COPY;

export function HallClosingCta() {
  return (
    <section className="landing-closing" aria-labelledby="closing-heading">
      <motion.div
        className="landing-closing__inner"
        initial="initial"
        whileInView="animate"
        viewport={{ once: true, margin: '-60px' }}
        variants={SLIDE_UP_VARIANTS}
      >
        <HoverLift className="landing-closing__panel" lift={-3}>
          <h2 id="closing-heading" className="landing-closing__headline font-display">
            {closing.headline}
          </h2>
          <p className="landing-closing__sub">{closing.sub}</p>
          <div className="landing-closing__actions">
            <HallCta href={closing.primary.href} label={closing.primary.label} />
            <HallCta href={closing.secondary.href} label={closing.secondary.label} variant="secondary" />
          </div>
        </HoverLift>
      </motion.div>
    </section>
  );
}
