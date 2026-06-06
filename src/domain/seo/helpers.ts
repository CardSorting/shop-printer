/**
 * [LAYER: DOMAIN — SEO]
 * Thin helpers for scoring listings in admin UI.
 */

import { auditListingSeo } from './health';
import type { ListingSeoInput } from './health';

export const SEO_LISTING_PASS_SCORE = 65;

export function scoreListing(input: ListingSeoInput): number {
  return auditListingSeo(input).score;
}

export function listingNeedsSeoAttention(input: ListingSeoInput): boolean {
  return scoreListing(input) < SEO_LISTING_PASS_SCORE;
}

export function scoreProductListing(product: {
  name: string;
  description?: string;
  seoTitle?: string;
  seoDescription?: string;
  handle?: string;
  imageUrl?: string;
}): number {
  return scoreListing({
    name: product.name,
    description: product.description,
    seoTitle: product.seoTitle,
    seoDescription: product.seoDescription,
    handle: product.handle,
    imageUrl: product.imageUrl,
  });
}

export function productNeedsSeoAttention(product: {
  name: string;
  description?: string;
  seoTitle?: string;
  seoDescription?: string;
  handle?: string;
  imageUrl?: string;
}): boolean {
  return scoreProductListing(product) < SEO_LISTING_PASS_SCORE;
}

export function scoreCollectionListing(collection: {
  name: string;
  description?: string;
  seoTitle?: string;
  seoDescription?: string;
  handle?: string;
  imageUrl?: string;
}): number {
  return scoreListing({
    name: collection.name,
    description: collection.description,
    seoTitle: collection.seoTitle,
    seoDescription: collection.seoDescription,
    handle: collection.handle,
    imageUrl: collection.imageUrl,
  });
}

export function collectionNeedsSeoAttention(collection: {
  name: string;
  description?: string;
  seoTitle?: string;
  seoDescription?: string;
  handle?: string;
  imageUrl?: string;
}): boolean {
  return scoreCollectionListing(collection) < SEO_LISTING_PASS_SCORE;
}

export function categoryNeedsSeoAttention(category: {
  name: string;
  description?: string | null;
  seoTitle?: string;
  seoDescription?: string;
  slug?: string;
  imageUrl?: string;
}): boolean {
  return scoreCategoryListing(category) < SEO_LISTING_PASS_SCORE;
}

export function scoreCategoryListing(category: {
  name: string;
  description?: string | null;
  seoTitle?: string;
  seoDescription?: string;
  slug?: string;
  imageUrl?: string;
}): number {
  return scoreListing({
    name: category.name,
    description: category.description ?? undefined,
    seoTitle: category.seoTitle,
    seoDescription: category.seoDescription,
    handle: category.slug,
    imageUrl: category.imageUrl,
  });
}
