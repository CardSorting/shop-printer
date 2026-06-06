/**
 * [LAYER: DOMAIN — SEO]
 * Prioritized “quick win” actions — Shopify setup guide pattern.
 */

import type { CatalogListingAuditItem } from './catalog';

export interface SeoQuickWin {
  id: string;
  title: string;
  description: string;
  href: string;
  priority: number;
}

export function buildQuickWins(items: CatalogListingAuditItem[], max = 5): SeoQuickWin[] {
  return items
    .slice()
    .sort((a, b) => a.score - b.score)
    .slice(0, max)
    .map((item, index) => {
      const kindLabel =
        item.kind === 'blog' ? 'story' : item.kind === 'collection' ? 'collection' : 'menu item';
      return {
        id: `${item.kind}-${item.id}`,
        title: item.name,
        description:
          item.score < 45
            ? `Missing title, description, or photo on this ${kindLabel} — biggest impact if fixed first.`
            : `A few tweaks to title or description on this ${kindLabel} could improve clicks.`,
        href: item.editPath,
        priority: index + 1,
      };
    });
}
