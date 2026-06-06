/**
 * [LAYER: CORE — SEO]
 * Resolves page-level SEO metadata from domain rules and site config.
 */

import {
  buildDefaultSiteDescription,
  buildDefaultSiteTitle,
  canonicalPath,
  collectionSeoDescription,
  menuItemSeoDescription,
  productSeoTitle,
  resolveAbsoluteUrl,
  resolvePageTitle,
  resolveSocialTitle,
  seoDescription,
} from '@domain/seo/rules';
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
    return {
      title: name,
      description: collectionSeoDescription(name, description, this.config.siteName),
      path: `/collections/${slug}`,
      keywords: SEO_KEYWORDS_MENU,
      images: imageUrl ? [imageUrl] : undefined,
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
