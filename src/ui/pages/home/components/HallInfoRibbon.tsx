import { LANDING_COPY, LANDING_META } from '../copy';

const { ribbon } = LANDING_COPY.hero;

type HallInfoRibbonProps = {
  hoursLabel: string;
  vibe?: string;
};

export function HallInfoRibbon({ hoursLabel, vibe }: HallInfoRibbonProps) {
  return (
    <dl className="landing-hall-ribbon" aria-label="WoodBine at a glance">
      <div>
        <dt>Hours</dt>
        <dd>{hoursLabel}</dd>
      </div>
      <div>
        <dt>Counters</dt>
        <dd>{LANDING_META.vendorCount} independent kitchens</dd>
      </div>
      <div>
        <dt>Neighborhood</dt>
        <dd>{ribbon.neighborhood}</dd>
      </div>
      <div>
        <dt>Right now</dt>
        <dd>{vibe ?? LANDING_META.tagline}</dd>
      </div>
    </dl>
  );
}
