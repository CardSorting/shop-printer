import { LANDING_COPY, LANDING_META } from '../copy';

const { ribbon } = LANDING_COPY.hero;

const RIBBON_ITEMS = [
  { key: 'hours', label: 'Hours', value: (hours: string) => hours },
  { key: 'counters', label: 'Counters', value: () => `${LANDING_META.vendorCount} independent kitchens` },
  { key: 'neighborhood', label: 'Neighborhood', value: () => ribbon.neighborhood },
  { key: 'vibe', label: 'Right now', value: (_hours: string, vibe?: string) => vibe ?? LANDING_META.tagline },
] as const;

type HallInfoRibbonProps = {
  hoursLabel: string;
  vibe?: string;
};

export function HallInfoRibbon({ hoursLabel, vibe }: HallInfoRibbonProps) {
  return (
    <dl className="landing-hall-ribbon landing-hall-ribbon--enter" aria-label="WoodBine at a glance">
      {RIBBON_ITEMS.map(({ key, label, value }) => (
        <div key={key} className="landing-hall-ribbon__item">
          <dt>{label}</dt>
          <dd>{value(hoursLabel, vibe)}</dd>
        </div>
      ))}
    </dl>
  );
}
