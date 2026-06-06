/**
 * [LAYER: CORE — SEO]
 * Public core surface for the WoodBine SEO engine.
 */

export { SeoEngine, createSeoEngine, getSeoEngine, resetSeoEngineForTests } from './SeoEngine';
export { PageMetadataService } from './PageMetadataService';
export {
  StructuredDataService,
  productToSeoContext,
  articleToSeoContext,
} from './StructuredDataService';
export { SeoHealthService } from './SeoHealthService';
export { SeoPreviewService } from './SeoPreviewService';
export { CrawlPolicyService } from './CrawlPolicyService';
export { SitemapPolicyService } from './SitemapPolicyService';
export { CatalogAuditService } from './CatalogAuditService';
export { SeoAdminReportService } from './SeoAdminReportService';
export type { SeoAdminReport } from './SeoAdminReportService';
export type { SeoAdminSnapshot, CatalogListingAuditItem, CatalogSeoSummary } from './CatalogAuditService';
