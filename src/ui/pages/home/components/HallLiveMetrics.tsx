'use client';

import { Clock, ShoppingBag, Timer, Users } from 'lucide-react';
import { LANDING_COPY } from '../copy';
import type { SimulatedHallPulse } from '../hooks/useSimulatedHallPulse';
import { LiveActivityFlash, LiveCountdown, LiveStatPulse, TableFillBar } from './HallLiveTickers';

const { social } = LANDING_COPY.vendors;

type HallLiveMetricsProps = {
  pulse: SimulatedHallPulse;
  isOpen: boolean;
  variant?: 'panel' | 'banner';
};

export function HallLiveMetrics({ pulse, isOpen, variant = 'panel' }: HallLiveMetricsProps) {
  const rootClass =
    variant === 'banner'
      ? `landing-hall-live-metrics landing-hall-live-metrics--banner landing-hall-live-metrics--${pulse.urgencyLevel}`
      : `landing-hall-live-metrics landing-hall-live-metrics--${pulse.urgencyLevel}`;

  if (!isOpen) {
    return (
      <div className={rootClass} aria-label="Hall opening countdown">
        <LiveCountdown
          totalSeconds={pulse.opensInSeconds}
          label={social.countdownOpens}
          variant="opens"
          maxSeconds={pulse.opensInSeconds}
          className="landing-hall-live-metrics__countdown-block"
        />
        <p className="landing-hall-live-metrics__countdown-label">{social.closedHint}</p>
      </div>
    );
  }

  return (
    <div className={rootClass} aria-label="Simulated live hall activity">
      <div className="landing-hall-live-metrics__countdown-row">
        <LiveCountdown
          totalSeconds={pulse.slotCountdownSeconds}
          label={social.countdownSlot}
          variant="slot"
          maxSeconds={pulse.slotMaxSeconds}
          className="landing-hall-live-metrics__countdown-block landing-hall-live-metrics__countdown-block--slot"
        />
        {pulse.closesInSeconds <= 7200 && (
          <LiveCountdown
            totalSeconds={pulse.closesInSeconds}
            label={social.countdownCloses}
            variant="closes"
            maxSeconds={7200}
            className="landing-hall-live-metrics__countdown-block"
          />
        )}
      </div>

      {pulse.rushLabel && (
        <div className="landing-hall-live-metrics__urgency" aria-live="polite">
          <span className="landing-hall-live-metrics__rush">{pulse.rushLabel}</span>
        </div>
      )}

      <TableFillBar pct={pulse.tableFillPct} taken={pulse.tablesTaken} total={pulse.tablesTotal} left={pulse.tablesLeft} />

      <dl className="landing-hall-live-metrics__grid">
        <div className="landing-hall-live-metrics__stat">
          <dt>
            <Users className="h-3 w-3" aria-hidden />
            {social.metrics.guests}
          </dt>
          <dd className="font-display">
            <LiveStatPulse value={pulse.guestsOnFloor} size="lg" hot={pulse.urgencyLevel === 'rush' || pulse.urgencyLevel === 'critical'} />
          </dd>
        </div>
        <div className="landing-hall-live-metrics__stat">
          <dt>
            <ShoppingBag className="h-3 w-3" aria-hidden />
            {social.metrics.ordersHour}
          </dt>
          <dd className="font-display">
            <LiveStatPulse value={pulse.ordersLastHour} size="lg" hot />
          </dd>
        </div>
        <div className="landing-hall-live-metrics__stat">
          <dt>{social.metrics.pickupQueue}</dt>
          <dd className="font-display">
            <LiveStatPulse value={pulse.pickupQueue} size="lg" />
          </dd>
        </div>
        <div className="landing-hall-live-metrics__stat">
          <dt>
            <Timer className="h-3 w-3" aria-hidden />
            {social.metrics.pickupWait}
          </dt>
          <dd className="font-display">
            <LiveStatPulse value={pulse.pickupWaitMins} suffix="m" size="lg" hot={pulse.urgencyLevel === 'critical'} />
          </dd>
        </div>
      </dl>

      <div className="landing-hall-live-metrics__timers">
        <span className="landing-hall-live-metrics__timer">
          <Clock className="h-3 w-3" aria-hidden />
          {social.metrics.lastOrder}{' '}
          <strong className="font-display">
            <LiveStatPulse value={pulse.lastOrderSeconds} suffix="s" size="sm" hot />
          </strong>
        </span>
      </div>

      <div className="landing-hall-live-metrics__activity" aria-live="polite">
        <span className="landing-hall-live-metrics__activity-dot" aria-hidden />
        <LiveActivityFlash line={pulse.activityLine} className="landing-hall-live-metrics__activity-line" />
      </div>
    </div>
  );
}
