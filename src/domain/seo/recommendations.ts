/**
 * [LAYER: DOMAIN — SEO]
 * Contextual merchant recommendations — Shopify / Yoast style.
 */

import type { ListingSeoInput } from './health';
import { auditListingSeo } from './health';
import type { SiteSeoAuditItem } from './health';
import { localListingRecommendations } from './local-listing-hints';

export type SeoListingKind = 'product' | 'blog' | 'collection' | 'category' | 'help' | 'help-category' | 'homepage';

export interface SeoRecommendation {
  id: string;
  title: string;
  detail: string;
  priority: 'high' | 'medium' | 'low';
}

export function listingRecommendations(
  input: ListingSeoInput,
  kind: SeoListingKind = 'product'
): SeoRecommendation[] {
  const health = auditListingSeo(input);
  const recs: SeoRecommendation[] = [];

  const kindLabel =
    kind === 'blog'
      ? 'story'
      : kind === 'category'
        ? 'category'
        : kind === 'collection'
          ? 'collection'
          : kind === 'homepage'
            ? 'homepage'
            : kind === 'help'
            ? 'help article'
            : kind === 'help-category'
              ? 'help topic page'
              : 'menu item';

  for (const item of health.checklist.filter((c) => !c.done)) {
    recs.push({
      id: item.id,
      title: item.label,
      detail: item.hint || `Improve this on your ${kindLabel} listing.`,
      priority: item.id.includes('title') || item.id.includes('description-present') ? 'high' : 'medium',
    });
  }

  for (const tip of health.suggestions) {
    recs.push({
      id: `tip-${recs.length}`,
      title: 'Suggestion',
      detail: tip,
      priority: 'medium',
    });
  }

  if (kind === 'blog' && !input.imageUrl) {
    recs.unshift({
      id: 'blog-featured-image',
      title: 'Add a featured image',
      detail: 'Stories with photos get more clicks when shared on social and in search.',
      priority: 'high',
    });
  }

  if (kind === 'help' && !input.imageUrl) {
    recs.unshift({
      id: 'help-featured-image',
      title: 'Add a cover image (optional)',
      detail: 'Help articles with images look better when shared — hours, maps, and event pages especially.',
      priority: 'medium',
    });
  }

  if (kind === 'help' || kind === 'help-category') {
    recs.push({
      id: 'help-local-keywords',
      title: 'Mention WoodBine and Salt Lake',
      detail: 'Guests search for local answers — include the hall name and city in your title or description.',
      priority: 'medium',
    });
  }

  if (kind === 'product' && !input.imageUrl) {
    recs.unshift({
      id: 'product-photo',
      title: 'Add a dish photo',
      detail: 'Menu items with photos rank better and look more appetizing in Google previews.',
      priority: 'high',
    });
  }

  for (const hint of localListingRecommendations(input)) {
    recs.push({
      id: `local-${recs.length}`,
      title: 'Local search tip',
      detail: hint,
      priority: 'low',
    });
  }

  if (kind === 'collection' && !input.imageUrl) {
    recs.unshift({
      id: 'collection-image',
      title: 'Add a collection image',
      detail: 'Collections with photos look better when shared and in Google previews.',
      priority: 'medium',
    });
  }

  if (kind === 'category' && !input.seoDescription && !input.description) {
    recs.unshift({
      id: 'category-description',
      title: 'Add a category description',
      detail: 'Categories with descriptions help Google understand what guests will find in this menu group.',
      priority: 'high',
    });
  }

  if (kind === 'help' && !input.seoDescription && !input.description) {
    recs.unshift({
      id: 'help-excerpt',
      title: 'Add a meta description',
      detail: 'Help articles with clear summaries rank better when guests search for hours, directions, or policies.',
      priority: 'high',
    });
  }

  const seen = new Set<string>();
  return recs.filter((r) => {
    const key = `${r.title}:${r.detail}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function siteRecommendations(items: SiteSeoAuditItem[]): SeoRecommendation[] {
  return items
    .filter((item) => !item.done)
    .map((item) => ({
      id: item.id,
      title: item.label,
      detail: item.hint,
      priority: item.priority,
    }));
}
