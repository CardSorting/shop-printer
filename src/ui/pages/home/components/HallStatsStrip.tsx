import { LANDING_COPY } from '../copy';
import { HALL_STATS } from '../constants';

const { stats } = LANDING_COPY;

export function HallStatsStrip() {
  return (
    <section className="landing-hall-stats" aria-label={stats.label}>
      <ul className="landing-hall-stats__grid">
        {HALL_STATS.map((item) => (
          <li key={item.label} className="landing-hall-stats__item">
            <span className="landing-hall-stats__value font-display">{item.value}</span>
            <span className="landing-hall-stats__label">{item.label}</span>
            <span className="landing-hall-stats__detail">{item.detail}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
