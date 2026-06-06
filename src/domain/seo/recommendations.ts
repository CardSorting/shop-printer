/**
 * [LAYER: DOMAIN — SEO]
 * Contextual merchant recommendations — Shopify / Yoast style.
 */

import type { ListingSeoInput } from './health';
import { auditListingSeo } from './health';
import type { SiteSeoAuditItem } from './health';

export type SeoListingKind = 'product' | 'blog' | 'collection' | 'homepage';

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
    kind === 'blog' ? 'story' : kind === 'collection' ? 'collection' : kind === 'homepage' ? 'homepage' : 'menu item';

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

  if (kind === 'product' && !input.imageUrl) {
    recs.unshift({
      id: 'product-photo',
      title: 'Add a dish photo',
      detail: 'Menu items with photos rank better and look more appetizing in Google previews.',
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
