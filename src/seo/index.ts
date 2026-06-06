/**
 * WoodBine SEO Engine — unified public entry.
 *
 * Layered architecture:
 *   domain/seo   → pure rules, brand, policies (no I/O)
 *   core/seo     → orchestration services
 *   infrastructure/seo → env config & Next.js adapters
 */
export * from '@domain/seo';
export * from '@core/seo';
export {
  getAppSeoEngine,
  getSeoConfig,
  buildNextPageMetadata,
  buildRootLayoutMetadata,
  toNextMetadata,
} from '@infrastructure/seo';
