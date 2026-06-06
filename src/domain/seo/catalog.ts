/**
 * [LAYER: DOMAIN — SEO]
 * Batch listing audit summaries for admin dashboards.
 */

import { auditListingSeo, gradeLabel, type ListingSeoInput } from './health';
import type { SeoGrade } from './constants';

export interface CatalogListingAuditItem {
  id: string;
  name: string;
  path: string;
  editPath: string;
  score: number;
  grade: SeoGrade;
  kind: 'product' | 'blog';
}

export interface CatalogSeoSummary {
  total: number;
  optimized: number;
  needsWork: number;
  items: CatalogListingAuditItem[];
}

const OPTIMIZED_THRESHOLD = 65;

export function auditCatalogListing(
  item: ListingSeoInput & { id: string; editPath: string; publicPath: string; kind: 'product' | 'blog' }
): CatalogListingAuditItem {
  const health = auditListingSeo(item);
  return {
    id: item.id,
    name: item.name,
    path: item.publicPath,
    editPath: item.editPath,
    score: health.score,
    grade: health.grade,
    kind: item.kind,
  };
}

export function summarizeCatalogAudits(items: CatalogListingAuditItem[]): CatalogSeoSummary {
  const needsWorkItems = items
    .filter((item) => item.score < OPTIMIZED_THRESHOLD)
    .sort((a, b) => a.score - b.score);

  return {
    total: items.length,
    optimized: items.length - needsWorkItems.length,
    needsWork: needsWorkItems.length,
    items: needsWorkItems.slice(0, 20),
  };
}

export function catalogGradeLabel(summary: CatalogSeoSummary): string {
  if (summary.total === 0) return 'No listings yet';
  if (summary.needsWork === 0) return 'All listings look good';
  return `${summary.needsWork} need${summary.needsWork === 1 ? 's' : ''} attention`;
}

export { gradeLabel as listingGradeLabel };
