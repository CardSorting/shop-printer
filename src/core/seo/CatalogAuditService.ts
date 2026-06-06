/**
 * [LAYER: CORE — SEO]
 * Audits product, blog, and collection catalogs for admin listing health views.
 */

import {
  auditCatalogListing,
  summarizeCatalogAudits,
  type CatalogListingAuditItem,
  type CatalogSeoSummary,
} from '@domain/seo/catalog';
import type { SeoSiteConfig } from '@domain/seo/types';

type ProductLike = {
  id: string;
  name: string;
  handle?: string;
  description?: string;
  seoTitle?: string;
  seoDescription?: string;
  imageUrl?: string;
  status?: string;
};

type BlogLike = {
  id: string;
  title: string;
  slug: string;
  excerpt?: string;
  metaTitle?: string;
  metaDescription?: string;
  featuredImageUrl?: string;
  ogImage?: string;
  status?: string;
  type?: string;
};

type CollectionLike = {
  id: string;
  name: string;
  handle: string;
  description?: string;
  imageUrl?: string;
  status?: string;
};

type CategoryLike = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  imageUrl?: string;
};

export interface SeoAdminSnapshot {
  siteScore: number;
  products: CatalogSeoSummary;
  blogPosts: CatalogSeoSummary;
  collections: CatalogSeoSummary;
  combinedNeedsWork: number;
}

export class CatalogAuditService {
  constructor(private readonly config: SeoSiteConfig) {}

  auditProducts(products: ProductLike[]): CatalogSeoSummary {
    const items = products
      .filter((p) => p.status === 'active' || !p.status)
      .map((product) =>
        auditCatalogListing({
          id: product.id,
          name: product.name,
          description: product.description,
          seoTitle: product.seoTitle,
          seoDescription: product.seoDescription,
          handle: product.handle || product.id,
          imageUrl: product.imageUrl,
          editPath: `/admin/products/${product.id}/edit`,
          publicPath: `/products/${product.handle || product.id}`,
          kind: 'product',
        })
      );
    return summarizeCatalogAudits(items);
  }

  auditBlogPosts(posts: BlogLike[]): CatalogSeoSummary {
    const items = posts
      .filter((p) => p.type === 'blog' && p.status === 'published')
      .map((post) =>
        auditCatalogListing({
          id: post.id,
          name: post.title,
          description: post.excerpt,
          seoTitle: post.metaTitle,
          seoDescription: post.metaDescription,
          handle: post.slug,
          imageUrl: post.featuredImageUrl || post.ogImage,
          editPath: `/admin/blog/${post.id}`,
          publicPath: `/blog/${post.slug}`,
          kind: 'blog',
        })
      );
    return summarizeCatalogAudits(items);
  }

  auditCollections(collections: CollectionLike[], categories: CategoryLike[] = []): CatalogSeoSummary {
    const merchItems = collections
      .filter((c) => c.status === 'active' || !c.status)
      .map((collection) =>
        auditCatalogListing({
          id: collection.id,
          name: collection.name,
          description: collection.description,
          handle: collection.handle,
          imageUrl: collection.imageUrl,
          editPath: '/admin/collections',
          publicPath: `/collections/${collection.handle}`,
          kind: 'collection',
        })
      );

    const categoryItems = categories.map((category) =>
      auditCatalogListing({
        id: category.id,
        name: category.name,
        description: category.description ?? undefined,
        handle: category.slug,
        imageUrl: category.imageUrl,
        editPath: '/admin/taxonomy',
        publicPath: `/collections/${category.slug}`,
        kind: 'collection',
      })
    );

    return summarizeCatalogAudits([...merchItems, ...categoryItems]);
  }

  buildAdminSnapshot(
    products: ProductLike[],
    posts: BlogLike[],
    collections: CollectionLike[] = [],
    categories: CategoryLike[] = []
  ): SeoAdminSnapshot {
    const productSummary = this.auditProducts(products);
    const blogSummary = this.auditBlogPosts(posts);
    const collectionSummary = this.auditCollections(collections, categories);

    return {
      siteScore: 0,
      products: productSummary,
      blogPosts: blogSummary,
      collections: collectionSummary,
      combinedNeedsWork:
        productSummary.needsWork + blogSummary.needsWork + collectionSummary.needsWork,
    };
  }
}

export type { CatalogListingAuditItem, CatalogSeoSummary };
