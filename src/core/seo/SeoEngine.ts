/**
 * [LAYER: CORE — SEO]
 * Central SEO orchestrator — single entry for metadata, structured data, and URL helpers.
 */

import { buildVisitFaqs } from '@domain/seo/faqs';
import {
  canonicalPath,
  productPathFromContext,
  productPathFromHandle,
  resolveAbsoluteUrl,
} from '@domain/seo/rules';
import type {
  BlogPostSeoContext,
  BreadcrumbItem,
  FaqEntry,
  JsonLd,
  ListItemRef,
  ProductSeoContext,
  ResolvedSeoPageMetadata,
  SeoPageMetadataInput,
  SeoSiteConfig,
} from '@domain/seo/types';
import { CrawlPolicyService } from './CrawlPolicyService';
import { CatalogAuditService } from './CatalogAuditService';
import { PageMetadataService } from './PageMetadataService';
import { SeoHealthService } from './SeoHealthService';
import { SeoPreviewService } from './SeoPreviewService';
import { SitemapPolicyService } from './SitemapPolicyService';
import { StructuredDataService } from './StructuredDataService';

export class SeoEngine {
  readonly pages: PageMetadataService;
  readonly structured: StructuredDataService;
  readonly health: SeoHealthService;
  readonly preview: SeoPreviewService;
  readonly crawl: CrawlPolicyService;
  readonly sitemap: SitemapPolicyService;
  readonly catalog: CatalogAuditService;

  constructor(readonly config: SeoSiteConfig) {
    this.pages = new PageMetadataService(config);
    this.structured = new StructuredDataService(config);
    this.health = new SeoHealthService(config);
    this.preview = new SeoPreviewService(config);
    this.crawl = new CrawlPolicyService(config);
    this.sitemap = new SitemapPolicyService(config);
    this.catalog = new CatalogAuditService(config);
  }

  absoluteUrl(pathOrUrl: string): string {
    return resolveAbsoluteUrl(this.config.siteUrl, pathOrUrl);
  }

  canonical(path: string): string {
    return canonicalPath(path);
  }

  productPath(product: Pick<ProductSeoContext, 'handle' | 'id'>): string {
    return productPathFromContext(product);
  }

  productPathFromHandle(handle: string, id?: string): string {
    return productPathFromHandle(handle, id);
  }

  resolvePage(input: SeoPageMetadataInput): ResolvedSeoPageMetadata {
    return this.pages.resolve(input);
  }

  visitFaqs(): readonly FaqEntry[] {
    return buildVisitFaqs(this.config.neighborhood);
  }

  breadcrumb(items: BreadcrumbItem[]): JsonLd {
    return this.structured.breadcrumb(items);
  }

  itemList(name: string, path: string, items: ListItemRef[]): JsonLd {
    return this.structured.itemList(name, path, items);
  }

  productStructuredData(
    product: ProductSeoContext,
    resolveImageUrl: (url: string) => string
  ): JsonLd[] {
    return [
      this.structured.product(product, resolveImageUrl),
      this.structured.menuItem(product, resolveImageUrl),
    ];
  }

  /** Standard noindex metadata for cart, checkout, account, etc. */
  privatePage(title: string, description: string, path: string): SeoPageMetadataInput {
    return {
      title,
      description,
      path,
      noIndex: true,
    };
  }
}

let engineInstance: SeoEngine | null = null;

export function createSeoEngine(config: SeoSiteConfig): SeoEngine {
  return new SeoEngine(config);
}

export function getSeoEngine(config: SeoSiteConfig): SeoEngine {
  if (!engineInstance) {
    engineInstance = createSeoEngine(config);
  }
  return engineInstance;
}

export function resetSeoEngineForTests(): void {
  engineInstance = null;
}
