/**
 * [LAYER: DOMAIN — SEO]
 * Storefront listing resolution — shared by PageMetadataService and admin previews.
 */

import { cleanSeoText, collectionSeoDescription } from './rules';

export interface CollectionListingInput {
  name: string;
  slug: string;
  description?: string | null;
  seoTitle?: string;
  seoDescription?: string;
  imageUrl?: string;
}

export function resolveCollectionPageTitle(input: CollectionListingInput): string {
  return cleanSeoText(input.seoTitle) || input.name;
}

export function resolveCollectionPageDescription(
  input: CollectionListingInput,
  siteName: string
): string {
  const custom = cleanSeoText(input.seoDescription);
  if (custom) return custom;
  return collectionSeoDescription(input.name, input.description, siteName);
}
