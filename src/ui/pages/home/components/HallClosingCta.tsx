import { HallCta } from './HallCta';
import { LANDING_COPY } from '../copy';

const { closing } = LANDING_COPY;

export function HallClosingCta() {
  return (
    <section className="landing-closing" aria-labelledby="closing-heading">
      <div className="landing-closing__inner">
        <h2 id="closing-heading" className="landing-closing__headline font-display">
          {closing.headline}
        </h2>
        <p className="landing-closing__sub">{closing.sub}</p>
        <div className="landing-closing__actions">
          <HallCta href={closing.primary.href} label={closing.primary.label} />
          <HallCta href={closing.secondary.href} label={closing.secondary.label} variant="secondary" />
        </div>
      </div>
    </section>
  );
}
