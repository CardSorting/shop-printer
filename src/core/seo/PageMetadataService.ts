/**
 * [LAYER: CORE — SEO]
 * Resolves page-level SEO metadata from domain rules and site config.
 */

import {
  buildDefaultSiteDescription,
  buildDefaultSiteTitle,
  canonicalPath,
  menuItemSeoDescription,
  productSeoTitle,
  resolveAbsoluteUrl,
  resolvePageTitle,
  resolveSocialTitle,
  seoDescription,
} from '@domain/seo/rules';
import {
  resolveCollectionPageDescription,
  resolveCollectionPageTitle,
  type CollectionListingInput,
} from '@domain/seo/storefront-listing';
import {
  SEO_KEYWORDS_BLOG,
  SEO_KEYWORDS_GLOBAL,
  SEO_KEYWORDS_MENU,
  SEO_KEYWORDS_VISIT,
} from '@domain/seo/keywords';
import { SITE_COMMUNITY_LINE, SITE_GATHERING_LINE, SITE_MENU_LINE, SITE_VENDOR_LINE } from '@domain/seo/brand';
import type {
  BlogPostSeoContext,
  OgImageDescriptor,
  ProductSeoContext,
  ResolvedSeoPageMetadata,
  SeoPageMetadataInput,
  SeoSiteConfig,
} from '@domain/seo/types';

export class PageMetadataService {
  constructor(private readonly config: SeoSiteConfig) {}

  resolve(input: SeoPageMetadataInput): ResolvedSeoPageMetadata {
    const clippedDescription = seoDescription(input.description, input.description);
    const canonical = canonicalPath(input.path);
    const ogImages = this.defaultOgImages(input.images?.[0]);
    const resolvedImageUrls = input.images?.length
      ? input.images.map((image) => this.url(image))
      : ogImages.map((image) => image.url);

    return {
      title: resolvePageTitle(input.title, Boolean(input.titleAbsolute)),
      description: clippedDescription,
      keywords: [...(input.keywords || SEO_KEYWORDS_GLOBAL)],
      canonical,
      socialTitle: resolveSocialTitle(input.title, this.config.siteName, Boolean(input.titleAbsolute)),
      ogImages,
      resolvedImageUrls,
      type: input.type || 'website',
      noIndex: Boolean(input.noIndex),
      publishedTime: input.publishedTime,
      modifiedTime: input.modifiedTime,
      authors: input.authors,
    };
  }

  home(): SeoPageMetadataInput {
    return {
      title: buildDefaultSiteTitle(),
      description: `${buildDefaultSiteDescription()} ${SITE_GATHERING_LINE}`,
      path: '/',
      keywords: SEO_KEYWORDS_GLOBAL,
      titleAbsolute: true,
    };
  }

  menu(hasFilters = false): SeoPageMetadataInput {
    return {
      title: 'Vendors & Menu',
      description: `${SITE_VENDOR_LINE} ${SITE_MENU_LINE}`,
      path: '/products',
      keywords: SEO_KEYWORDS_MENU,
      noIndex: hasFilters,
    };
  }

  visit(): SeoPageMetadataInput {
    return {
      title: 'Visit & Connect',
      description: `Hours, directions, private events, and answers about WoodBine—${this.config.locality}'s neighborhood table for food, company, and community. ${SITE_COMMUNITY_LINE}`,
      path: '/support',
      keywords: SEO_KEYWORDS_VISIT,
    };
  }

  blogIndex(): SeoPageMetadataInput {
    return {
      title: 'Stories from the Hall',
      description: `Vendor spotlights, community nights, and the people who make WoodBine a neighborhood table in ${this.config.locality}. Meet the vendors, hear from regulars, and see what brings people back under the barrel roof.`,
      path: '/blog',
      keywords: SEO_KEYWORDS_BLOG,
    };
  }

  blogPost(article: BlogPostSeoContext, extraTags: string[] = []): SeoPageMetadataInput {
    const title = article.metaTitle || article.ogTitle || article.title;
    const images = [article.ogImage, article.featuredImageUrl].filter((url): url is string => Boolean(url));

    return {
      title,
      description: article.metaDescription || article.excerpt,
      path: `/blog/${article.slug}`,
      keywords: [...SEO_KEYWORDS_BLOG, ...extraTags],
      images: images.length ? images : undefined,
      type: 'article',
    };
  }

  product(product: ProductSeoContext): SeoPageMetadataInput {
    const title = product.vendor
      ? `${productSeoTitle(product)} — ${product.vendor}`
      : productSeoTitle(product);

    return {
      title,
      description: menuItemSeoDescription(product, this.config.locality, this.config.siteName),
      path: `/products/${product.handle || product.id}`,
    };
  }

  productNotFound(handle: string): SeoPageMetadataInput {
    return {
      title: 'Menu Item Not Found',
      description: 'This dish or menu item is no longer available at WoodBine food hall.',
      path: `/products/${handle}`,
      noIndex: true,
    };
  }

  collection(name: string, slug: string, description?: string | null, hasFilters = false, imageUrl?: string): SeoPageMetadataInput {
    return this.collectionListing({ name, slug, description, imageUrl }, hasFilters);
  }

  collectionListing(input: CollectionListingInput, hasFilters = false): SeoPageMetadataInput {
    return {
      title: resolveCollectionPageTitle(input),
      description: resolveCollectionPageDescription(input, this.config.siteName),
      path: `/collections/${input.slug}`,
      keywords: SEO_KEYWORDS_MENU,
      images: input.imageUrl ? [input.imageUrl] : undefined,
      noIndex: hasFilters,
    };
  }

  search(query?: string): SeoPageMetadataInput {
    const trimmed = query?.trim();
    return {
      title: trimmed ? `Search: ${trimmed}` : 'Search Menu & Vendors',
      description: trimmed
        ? `Search results for “${trimmed}” at WoodBine food hall in ${this.config.locality} — vendors, dishes, and crowd favorites.`
        : `Search WoodBine vendors, dishes, and menu favorites at our ${this.config.locality} food hall.`,
      path: '/search',
      keywords: SEO_KEYWORDS_MENU,
      noIndex: true,
    };
  }

  blogPostNotFound(slug: string): SeoPageMetadataInput {
    return {
      title: 'Story Not Found',
      description: 'This story from the hall is no longer available at WoodBine.',
      path: `/blog/${slug}`,
      noIndex: true,
    };
  }

  supportArticle(article: {
    title: string;
    slug: string;
    excerpt?: string;
    metaTitle?: string;
    metaDescription?: string;
    featuredImageUrl?: string;
  }): SeoPageMetadataInput {
    return {
      title: article.metaTitle || article.title,
      description:
        article.metaDescription ||
        article.excerpt ||
        `Help article about ${article.title} at WoodBine food hall in ${this.config.locality}.`,
      path: `/support/articles/${article.slug}`,
      keywords: SEO_KEYWORDS_VISIT,
      images: article.featuredImageUrl ? [article.featuredImageUrl] : undefined,
    };
  }

  supportArticleNotFound(slug: string): SeoPageMetadataInput {
    return {
      title: 'Help Article Not Found',
      description: 'This help article is no longer available at WoodBine.',
      path: `/support/articles/${slug}`,
      noIndex: true,
    };
  }

  supportCategory(category: {
    name: string;
    slug: string;
    description?: string | null;
  }): SeoPageMetadataInput {
    return {
      title: `${category.name} — Help Center`,
      description:
        category.description ||
        `${category.name} articles for guests visiting WoodBine food hall in ${this.config.locality}.`,
      path: `/support/categories/${category.slug}`,
      keywords: SEO_KEYWORDS_VISIT,
    };
  }

  authLogin(): SeoPageMetadataInput {
    return {
      title: 'Sign In',
      description: 'Sign in to your WoodBine account.',
      path: '/login',
      noIndex: true,
    };
  }

  authRegister(): SeoPageMetadataInput {
    return {
      title: 'Create Account',
      description: 'Create a WoodBine account for faster checkout and order history.',
      path: '/register',
      noIndex: true,
    };
  }

  authForgotPassword(): SeoPageMetadataInput {
    return {
      title: 'Reset Password',
      description: 'Reset your WoodBine account password.',
      path: '/forgot-password',
      noIndex: true,
    };
  }

  authResetPassword(): SeoPageMetadataInput {
    return {
      title: 'Set New Password',
      description: 'Set a new password for your WoodBine account.',
      path: '/auth/reset-password',
      noIndex: true,
    };
  }

  orderDetail(orderId: string): SeoPageMetadataInput {
    return this.privatePage(
      'Order Details',
      'Your WoodBine order confirmation and delivery status.',
      `/orders/${orderId}`
    );
  }

  accountVault(): SeoPageMetadataInput {
    return this.privatePage(
      'Digital Library',
      'Your saved digital items and downloads from WoodBine.',
      '/account/vault'
    );
  }

  private privatePage(title: string, description: string, path: string): SeoPageMetadataInput {
    return {
      title,
      description,
      path,
      noIndex: true,
    };
  }

  defaultOgImages(customPath?: string): OgImageDescriptor[] {
    const url = this.url(customPath || this.config.defaultOgImage);
    return [
      {
        url,
        width: 1200,
        height: 630,
        alt: `${this.config.siteName} — ${this.config.tagline} | ${this.config.locality} food hall`,
      },
    ];
  }

  private url(pathOrUrl: string): string {
    return resolveAbsoluteUrl(this.config.siteUrl, pathOrUrl);
  }
}
