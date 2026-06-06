/**
 * [LAYER: DOMAIN — SEO]
 * Keyword intent clusters for page-level metadata.
 */

export const SEO_KEYWORDS_GLOBAL = [
  'WoodBine',
  'WoodBine food hall',
  'Salt Lake City food hall',
  'SLC food hall',
  'warehouse dining Salt Lake',
  'Salt Lake City restaurants',
  'local vendors Salt Lake',
  'neighborhood food hall',
  'no reservation dining SLC',
  'private events Salt Lake City',
  'patio dining Salt Lake',
  'third place Salt Lake',
  'arts district dining',
  'gathering place Salt Lake',
  'food hall near me',
  'Old Hall New Flavors',
  'barrel roof dining SLC',
  'walk in food hall Salt Lake',
  'Salt Lake warehouse restaurant',
  'community dining SLC',
] as const;

export const SEO_KEYWORDS_MENU = [
  ...SEO_KEYWORDS_GLOBAL,
  'WoodBine menu',
  'food hall vendors SLC',
  'order ahead food hall',
  'Salt Lake City lunch',
  'warehouse patio dining',
  'vendor food hall menu',
  'best food hall dishes SLC',
] as const;

export const SEO_KEYWORDS_VISIT = [
  ...SEO_KEYWORDS_GLOBAL,
  'WoodBine hours',
  'WoodBine directions',
  'WoodBine private events',
  'food hall parking Salt Lake',
  'host event Salt Lake City',
  'WoodBine location',
  'walk in dining Salt Lake City',
] as const;

export const SEO_KEYWORDS_BLOG = [
  ...SEO_KEYWORDS_GLOBAL,
  'WoodBine stories',
  'Salt Lake food scene',
  'vendor spotlight SLC',
  'community food hall',
  'neighborhood table Salt Lake',
  'food hall culture SLC',
] as const;
