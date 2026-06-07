import { LANDING_COPY } from '../copy';
import { HALL_AMENITIES } from '../constants';

const { amenities } = LANDING_COPY;

export function HallAmenitiesStrip() {
  return (
    <section className="landing-amenities" aria-labelledby="hall-amenities-heading">
      <div className="landing-amenities__header">
        <p className="landing-amenities__label">{amenities.label}</p>
        <h2 id="hall-amenities-heading" className="landing-amenities__headline font-display">
          {amenities.headline}
        </h2>
      </div>

      <ul className="landing-amenities__grid">
        {HALL_AMENITIES.map((item) => (
          <li key={item.id} className="landing-amenities__item">
            <span className="landing-amenities__item-label">{item.label}</span>
            <span className="landing-amenities__item-detail">{item.detail}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
