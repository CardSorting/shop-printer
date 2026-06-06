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
import { helpArticleEditHref, taxonomyCategoryEditHref } from '@domain/seo/admin-routes';

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
  seoTitle?: string;
  seoDescription?: string;
  imageUrl?: string;
  status?: string;
};

type CategoryLike = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  seoTitle?: string;
  seoDescription?: string;
  imageUrl?: string;
};

export interface SeoAdminSnapshot {
  siteScore: number;
  products: CatalogSeoSummary;
  blogPosts: CatalogSeoSummary;
  collections: CatalogSeoSummary;
  helpArticles: CatalogSeoSummary;
  combinedNeedsWork: number;
}

type HelpArticleLike = {
  id: string;
  title: string;
  slug: string;
  excerpt?: string;
  metaTitle?: string;
  metaDescription?: string;
  featuredImageUrl?: string;
  status?: string;
  type?: string;
};

type HelpCategoryLike = {
  id: string;
  name: string;
  slug: string;
  description?: string;
};

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
          seoTitle: collection.seoTitle,
          seoDescription: collection.seoDescription,
          handle: collection.handle,
          imageUrl: collection.imageUrl,
          editPath: `/admin/collections/${collection.id}/edit`,
          publicPath: `/collections/${collection.handle}`,
          kind: 'collection',
        })
      );

    const categoryItems = categories.map((category) =>
      auditCatalogListing({
        id: category.id,
        name: category.name,
        description: category.description ?? undefined,
        seoTitle: category.seoTitle,
        seoDescription: category.seoDescription,
        handle: category.slug,
        imageUrl: category.imageUrl,
        editPath: taxonomyCategoryEditHref(category.id),
        publicPath: `/collections/${category.slug}`,
        kind: 'category',
      })
    );

    return summarizeCatalogAudits([...merchItems, ...categoryItems]);
  }

  auditHelpCenter(articles: HelpArticleLike[], categories: HelpCategoryLike[] = []): CatalogSeoSummary {
    const articleItems = articles
      .filter((a) => a.type === 'article' && a.status === 'published')
      .map((article) =>
        auditCatalogListing({
          id: article.id,
          name: article.title,
          description: article.excerpt,
          seoTitle: article.metaTitle,
          seoDescription: article.metaDescription,
          handle: article.slug,
          imageUrl: article.featuredImageUrl,
          editPath: helpArticleEditHref(article.id),
          publicPath: `/support/articles/${article.slug}`,
          kind: 'help',
        })
      );

    const categoryItems = categories.map((category) =>
      auditCatalogListing({
        id: category.id,
        name: category.name,
        description: category.description,
        seoTitle: `${category.name} — Help Center`,
        seoDescription:
          category.description ||
          `${category.name} articles for guests visiting WoodBine food hall in ${this.config.locality}.`,
        handle: category.slug,
        editPath: '/admin/support',
        publicPath: `/support/categories/${category.slug}`,
        kind: 'help-category',
      })
    );

    return summarizeCatalogAudits([...articleItems, ...categoryItems]);
  }

  buildAdminSnapshot(
    products: ProductLike[],
    posts: BlogLike[],
    collections: CollectionLike[] = [],
    categories: CategoryLike[] = [],
    helpArticles: HelpArticleLike[] = [],
    helpCategories: HelpCategoryLike[] = []
  ): SeoAdminSnapshot {
    const productSummary = this.auditProducts(products);
    const blogSummary = this.auditBlogPosts(posts);
    const collectionSummary = this.auditCollections(collections, categories);
    const helpSummary = this.auditHelpCenter(helpArticles, helpCategories);

    return {
      siteScore: 0,
      products: productSummary,
      blogPosts: blogSummary,
      collections: collectionSummary,
      helpArticles: helpSummary,
      combinedNeedsWork:
        productSummary.needsWork +
        blogSummary.needsWork +
        collectionSummary.needsWork +
        helpSummary.needsWork,
    };
  }
}

export type { CatalogListingAuditItem, CatalogSeoSummary };
