/**
 * [LAYER: DOMAIN — SEO]
 * Industry-standard field limits (Google / Shopify / Yoast conventions).
 */

export const SEO_TITLE_MIN = 30;
export const SEO_TITLE_MAX = 60;
export const SEO_DESCRIPTION_MIN = 120;
export const SEO_DESCRIPTION_MAX = 160;
export const SEO_HANDLE_MIN = 3;

export const SEO_GRADE_THRESHOLDS = {
  excellent: 85,
  good: 65,
  needsWork: 45,
} as const;

export type SeoGrade = 'excellent' | 'good' | 'needs-work' | 'poor';
