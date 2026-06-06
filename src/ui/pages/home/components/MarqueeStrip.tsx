import { LANDING_COPY } from '../copy';

const { marquee } = LANDING_COPY;

export function MarqueeStrip() {
  const forward = [...marquee.forward, ...marquee.forward];
  const reverse = [...marquee.reverse, ...marquee.reverse];

  return (
    <div className="landing-marquee landing-marquee--dual" aria-hidden>
      <div className="landing-marquee__track landing-marquee__track--forward">
        {forward.map((item, i) => (
          <span key={`f-${item}-${i}`} className="landing-marquee__item">
            <span className="landing-marquee__word">{item}</span>
            <span className="landing-marquee__dot" />
          </span>
        ))}
      </div>
      <div className="landing-marquee__track landing-marquee__track--reverse">
        {reverse.map((item, i) => (
          <span key={`r-${item}-${i}`} className="landing-marquee__item">
            <span className="landing-marquee__word landing-marquee__word--italic font-display">{item}</span>
            <span className="landing-marquee__dot" />
          </span>
        ))}
      </div>
    </div>
  );
}
