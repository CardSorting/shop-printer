import Image from 'next/image';
import type { HALL_FOOD_PARALLAX_FRAMES } from '../constants';
import { LandingGradientOverlay } from './LandingGradientOverlay';

type FoodParallaxFrame = (typeof HALL_FOOD_PARALLAX_FRAMES)[number];

type HallFoodParallaxBreakProps = {
  frame: FoodParallaxFrame;
  step: number;
  total: number;
};

export function HallFoodParallaxBreak({ frame, step }: HallFoodParallaxBreakProps) {
  const eager = step === 1;

  return (
    <section
      id={`landing-food-${frame.id}`}
      className={`landing-food-pass landing-food-pass--static landing-food-pass--${frame.align} landing-section-deferred`}
      data-food-pass={frame.id}
      aria-labelledby={`food-caption-${frame.id}`}
    >
      <div className="landing-section-divider landing-section-divider--enter" aria-hidden />

      <div className="landing-food-pass__stage">
        <span className="landing-food-pass__cinema-rail landing-food-pass__cinema-rail--top" aria-hidden />
        <span className="landing-food-pass__cinema-rail landing-food-pass__cinema-rail--bottom" aria-hidden />

        <div className="landing-food-pass__media landing-food-pass__media--static">
          <div className="landing-food-pass__media-inner">
            <Image
              src={frame.src}
              alt={frame.alt}
              fill
              quality={68}
              priority={eager}
              loading={eager ? undefined : 'lazy'}
              sizes="100vw"
              className="landing-food-pass__image"
              style={{ objectPosition: frame.objectPosition }}
            />
          </div>
          <LandingGradientOverlay variant="food-pass" />
        </div>

        <div
          className={`landing-food-pass__content landing-food-pass__content--${frame.align} landing-food-pass__content--static landing-food-pass__content--enter`}
        >
          <p className="landing-food-pass__kicker">{frame.kicker}</p>
          <div className="landing-food-pass__rule" aria-hidden />
          <p id={`food-caption-${frame.id}`} className="landing-food-pass__caption font-display">
            {frame.caption}
          </p>
          {frame.detail && <p className="landing-food-pass__detail">{frame.detail}</p>}
        </div>
      </div>
    </section>
  );
}
