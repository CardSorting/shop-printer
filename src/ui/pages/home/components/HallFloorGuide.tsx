import { LANDING_COPY } from '../copy';
import { HALL_ZONES } from '../constants';

const { floorGuide } = LANDING_COPY.story;

export function HallFloorGuide() {
  return (
    <div className="landing-floor-guide" aria-labelledby="floor-guide-heading">
      <div className="landing-floor-guide__header">
        <p className="landing-floor-guide__label">{floorGuide.label}</p>
        <h3 id="floor-guide-heading" className="landing-floor-guide__headline font-display">
          {floorGuide.headline}
        </h3>
      </div>

      <div className="landing-floor-guide__map" aria-hidden>
        <span className="landing-floor-guide__zone landing-floor-guide__zone--counters">Line</span>
        <span className="landing-floor-guide__zone landing-floor-guide__zone--communal">Floor</span>
        <span className="landing-floor-guide__zone landing-floor-guide__zone--patio">Patio</span>
        <span className="landing-floor-guide__zone landing-floor-guide__zone--bar">Bar</span>
      </div>

      <ol className="landing-floor-guide__list">
        {HALL_ZONES.map((zone, i) => (
          <li key={zone.id} className="landing-floor-guide__item">
            <span className="landing-floor-guide__item-index">{String(i + 1).padStart(2, '0')}</span>
            <div>
              <h4 className="landing-floor-guide__item-label font-display">{zone.label}</h4>
              <p className="landing-floor-guide__item-desc">{zone.description}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
