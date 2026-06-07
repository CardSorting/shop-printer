'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { LANDING_COPY } from '../copy';
import { FIRST_VISIT_TIPS } from '../constants';

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
        {FIRST_VISIT_TIPS.map((tip, i) => {
          const open = openIndex === i;
          return (
            <div key={tip.q} className={`landing-first-timer__item ${open ? 'landing-first-timer__item--open' : ''}`}>
              <button
                type="button"
                className="landing-first-timer__trigger"
                aria-expanded={open}
                onClick={() => setOpenIndex(open ? null : i)}
              >
                <span>{tip.q}</span>
                <ChevronDown className="landing-first-timer__chevron h-4 w-4" aria-hidden />
              </button>
              {open && <p className="landing-first-timer__answer">{tip.a}</p>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
