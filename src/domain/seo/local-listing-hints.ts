/**
 * [LAYER: DOMAIN — SEO]
 * WoodBine-local listing signals — lightweight Yoast “focus phrase” pattern for food hall SEO.
 */

import type { ListingSeoInput } from './health';

export interface LocalListingSignal {
  id: string;
  label: string;
  met: boolean;
  hint: string;
}

const BRAND_TERM = 'woodbine';
const LOCALITY_TERMS = ['salt lake', 'slc', 'utah'];

/** Checks whether listing copy reinforces WoodBine + local discovery */
export function auditLocalListingSignals(input: ListingSeoInput): LocalListingSignal[] {
  const title = (input.seoTitle || input.name || '').toLowerCase();
  const description = (input.seoDescription || input.description || '').toLowerCase();
  const combined = `${title} ${description}`;

  return [
    {
      id: 'brand-name',
      label: 'WoodBine mentioned',
      met: combined.includes(BRAND_TERM),
      hint: 'Include "WoodBine" so searchers connect this listing to the food hall.',
    },
    {
      id: 'locality',
      label: 'Local area referenced',
      met: LOCALITY_TERMS.some((term) => combined.includes(term)),
      hint: 'Add "Salt Lake City" or "Utah" to help "near me" and local food searches.',
    },
  ];
}

export function localListingRecommendations(input: ListingSeoInput): string[] {
  return auditLocalListingSignals(input)
    .filter((signal) => !signal.met)
    .map((signal) => signal.hint);
}
