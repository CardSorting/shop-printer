import { LANDING_SECTIONS } from '../copy';

/** Sections with dark backgrounds — side rail switches to light text */
export const LANDING_DARK_SECTION_IDS = new Set([
  'landing-vendors',
  'landing-visit',
  'landing-gatherings',
  'landing-beyond',
  'landing-directions',
]);

export function isLandingDarkSection(id: string) {
  return LANDING_DARK_SECTION_IDS.has(id);
}

export { LANDING_SECTIONS };
