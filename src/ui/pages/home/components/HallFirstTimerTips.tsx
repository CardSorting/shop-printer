'use client';

import { useState } from 'react';
import { LANDING_COPY } from '../copy';
import { FIRST_VISIT_TIPS } from '../constants';
import { AccordionRow } from './MicroMotion';

const { firstTimer } = LANDING_COPY;

export function HallFirstTimerTips() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div className="landing-first-timer" aria-labelledby="first-timer-heading">
      <div className="landing-first-timer__header">
        <p className="landing-first-timer__label">{firstTimer.label}</p>
        <h3 id="first-timer-heading" className="landing-first-timer__headline font-display">
          {firstTimer.headline}
        </h3>
      </div>

      <div className="landing-first-timer__list">
        {FIRST_VISIT_TIPS.map((tip, i) => (
          <AccordionRow
            key={tip.q}
            question={tip.q}
            answer={tip.a}
            open={openIndex === i}
            onToggle={() => setOpenIndex(openIndex === i ? null : i)}
          />
        ))}
      </div>
    </div>
  );
}
