/**
 * [LAYER: CORE — SEO]
 * JSON-LD structured data composition — orchestrates domain rules with site config.
 */

import {
  blogPostSeoDescription,
  buildDefaultSiteDescription,
  buildDefaultSiteTitle,
  menuItemSeoDescription,
  priceFromCents,
  productPathFromContext,
  resolveAbsoluteUrl,
  toIsoDate,
} from '@domain/seo/rules';
import { SEO_KEYWORDS_GLOBAL } from '@domain/seo/keywords';
import { WOODBINE_BRAND } from '@domain/seo/brand';
import type {
  BlogPostSeoContext,
  BreadcrumbItem,
  FaqEntry,
  JsonLd,
  ListItemRef,
  ProductSeoContext,
  SeoSiteConfig,
} from '@domain/seo/types';

const OPTION_SCHEMA_MAP: Record<string, string> = {
  color: 'https://schema.org/color',
  colour: 'https://schema.org/color',
  size: 'https://schema.org/size',
  age: 'https://schema.org/suggestedAge',
  gender: 'https://schema.org/suggestedGender',
  material: 'https://schema.org/material',
  pattern: 'https://schema.org/pattern',
};

const WEEKDAYS = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
] as const;

function compactJsonLd<T extends JsonLd>(value: T): T {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => {
      if (entry === undefined || entry === null || entry === '') return false;
      if (Array.isArray(entry) && entry.length === 0) return false;
      return true;
    })
  ) as T;
}

function stripJsonLdContext(value: JsonLd): JsonLd {
  const { '@context': _context, ...rest } = value;
  return rest;
}

export class StructuredDataService {
  constructor(private readonly config: SeoSiteConfig) {}

  private url(path: string): string {
    return resolveAbsoluteUrl(this.config.siteUrl, path);
  }

  breadcrumb(items: BreadcrumbItem[]): JsonLd {
    return {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: items.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: item.name,
        item: this.url(item.path),
      })),
    };
  }

  organization(): JsonLd {
    return compactJsonLd({
      '@type': 'Organization',
      '@id': `${this.config.siteUrl}#organization`,
      name: this.config.siteName,
      url: this.config.siteUrl,
      logo: {
        '@type': 'ImageObject',
        url: this.url('/logo.png'),
        width: 512,
        height: 512,
      },
      image: this.url(this.config.defaultOgImage),
      description: buildDefaultSiteDescription(),
      email: WOODBINE_BRAND.email,
      ...(this.config.phone ? { telephone: this.config.phone } : {}),
      sameAs: [...this.config.socialProfiles],
    });
  }

  foodEstablishment(): JsonLd {
    const address = this.config.street
      ? compactJsonLd({
          '@type': 'PostalAddress',
          streetAddress: this.config.street,
          addressLocality: this.config.locality,
          addressRegion: this.config.region,
          postalCode: this.config.postal,
          addressCountry: this.config.country,
        })
      : undefined;

    const geo =
      this.config.geoLat !== undefined && this.config.geoLng !== undefined
        ? {
            '@type': 'GeoCoordinates',
            latitude: this.config.geoLat,
            longitude: this.config.geoLng,
          }
        : undefined;

    const hours =
      this.config.hoursOpens && this.config.hoursCloses
        ? [
            {
              '@type': 'OpeningHoursSpecification',
              dayOfWeek: [...WEEKDAYS],
              opens: this.config.hoursOpens,
              closes: this.config.hoursCloses,
            },
          ]
        : undefined;

    return compactJsonLd({
      '@type': ['FoodEstablishment', 'Restaurant'],
      '@id': `${this.config.siteUrl}#food-establishment`,
      name: this.config.siteName,
      alternateName: [
        this.config.tagline,
        `${this.config.siteName} Food Hall`,
        `${this.config.siteName} ${this.config.locality}`,
      ],
      url: this.config.siteUrl,
      description: buildDefaultSiteDescription(),
      image: this.url(this.config.defaultOgImage),
      servesCuisine: 'American, International, Local',
      priceRange: '$$',
      acceptsReservations: false,
      hasMenu: this.url('/collections/bestsellers'),
      menu: this.url('/collections/bestsellers'),
      ...(address ? { address } : { areaServed: { '@type': 'City', name: this.config.locality } }),
      ...(geo ? { geo } : {}),
      ...(hours ? { openingHoursSpecification: hours } : {}),
      ...(this.config.phone ? { telephone: this.config.phone } : {}),
      amenityFeature: [
        { '@type': 'LocationFeatureSpecification', name: 'Outdoor seating', value: true },
        { '@type': 'LocationFeatureSpecification', name: 'Private events', value: true },
        { '@type': 'LocationFeatureSpecification', name: 'Walk-ins welcome', value: true },
        { '@type': 'LocationFeatureSpecification', name: 'Shared seating', value: true },
        { '@type': 'LocationFeatureSpecification', name: 'Ping pong and cornhole', value: true },
      ],
      keywords: SEO_KEYWORDS_GLOBAL.join(', '),
      publicAccess: true,
      parentOrganization: { '@id': `${this.config.siteUrl}#organization` },
    });
  }

  webSite(): JsonLd {
    return {
      '@type': 'WebSite',
      '@id': `${this.config.siteUrl}#website`,
      url: this.config.siteUrl,
      name: this.config.siteName,
      alternateName: [
        this.config.tagline,
        `${this.config.siteName} Food Hall`,
        `${this.config.siteName} ${this.config.locality}`,
      ],
      description: buildDefaultSiteDescription(),
      inLanguage: 'en-US',
      publisher: { '@id': `${this.config.siteUrl}#organization` },
      potentialAction: {
        '@type': 'SearchAction',
        target: {
          '@type': 'EntryPoint',
          urlTemplate: `${this.config.siteUrl}/search?q={search_term_string}`,
        },
        'query-input': 'required name=search_term_string',
      },
    };
  }

  homePageGraph(): JsonLd {
    return {
      '@context': 'https://schema.org',
      '@graph': [
        stripJsonLdContext(this.organization()),
        stripJsonLdContext(this.foodEstablishment()),
        stripJsonLdContext(this.webSite()),
        {
          '@type': 'WebPage',
          '@id': `${this.config.siteUrl}/#webpage`,
          url: this.config.siteUrl,
          name: buildDefaultSiteTitle(),
          description: buildDefaultSiteDescription(),
          isPartOf: { '@id': `${this.config.siteUrl}#website` },
          about: { '@id': `${this.config.siteUrl}#food-establishment` },
          inLanguage: 'en-US',
          speakable: {
            '@type': 'SpeakableSpecification',
            cssSelector: ['h1', '[data-seo-speakable]'],
          },
        },
      ],
    };
  }

  itemList(name: string, path: string, items: ListItemRef[]): JsonLd {
    return {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name,
      url: this.url(path),
      numberOfItems: items.length,
      itemListElement: items.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: item.name,
        url: this.url(item.path),
      })),
    };
  }

  faqPage(faqs: ReadonlyArray<FaqEntry>): JsonLd {
    return {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faqs.map((faq) => ({
        '@type': 'Question',
        name: faq.question,
        acceptedAnswer: { '@type': 'Answer', text: faq.answer },
      })),
    };
  }

  howToVisit(): JsonLd {
    return {
      '@context': 'https://schema.org',
      '@type': 'HowTo',
      name: 'How to Make the Most of Your Visit to WoodBine',
      description: `A quick guide to enjoying WoodBine food hall in ${this.config.locality}—vendors, seating, community, and the room.`,
      step: [
        {
          '@type': 'HowToStep',
          position: 1,
          name: 'Walk In',
          text: 'No reservation required. Come as you are—solo, with coworkers, or with your whole crew.',
          url: this.url('/support#visit-walk-in'),
        },
        {
          '@type': 'HowToStep',
          position: 2,
          name: 'Explore the Vendors',
          text: 'Browse the hall and pick from independent kitchens—each with their own counter and regulars.',
          url: this.url('/support#visit-vendors'),
        },
        {
          '@type': 'HowToStep',
          position: 3,
          name: 'Find Your Spot',
          text: 'Grab a seat at the bar, on the patio, or at a shared table. Linger as long as the conversation lasts.',
          url: this.url('/support#visit-seating'),
        },
      ],
      totalTime: 'PT5M',
    };
  }

  blogIndex(): JsonLd {
    return {
      '@context': 'https://schema.org',
      '@type': 'Blog',
      '@id': `${this.config.siteUrl}/blog#blog`,
      name: 'Stories from the Hall',
      description: `Vendor spotlights, community nights, and neighborhood stories from WoodBine in ${this.config.locality}.`,
      url: this.url('/blog'),
      inLanguage: 'en-US',
      publisher: { '@id': `${this.config.siteUrl}#organization` },
      isPartOf: { '@id': `${this.config.siteUrl}#website` },
    };
  }

  blogArticle(article: BlogPostSeoContext, authorName?: string): JsonLd {
    const url = this.url(`/blog/${article.slug}`);
    const image = article.featuredImageUrl || article.ogImage;

    return compactJsonLd({
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      '@id': `${url}#article`,
      headline: article.metaTitle || article.title,
      description: blogPostSeoDescription(article, this.config.locality),
      url,
      ...(image ? { image: this.url(image) } : {}),
      datePublished: toIsoDate(article.publishedAt || article.createdAt),
      dateModified: toIsoDate(article.updatedAt),
      author: {
        '@type': 'Person',
        name: authorName || article.authorName || `${this.config.siteName} Team`,
      },
      publisher: { '@id': `${this.config.siteUrl}#organization` },
      mainEntityOfPage: url,
      keywords: article.tags?.join(', '),
      inLanguage: 'en-US',
      isPartOf: { '@id': `${this.config.siteUrl}#website` },
    });
  }

  /** Help center / Visit & Connect articles — FAQ-style discoverability */
  helpArticle(article: BlogPostSeoContext): JsonLd {
    const url = this.url(`/support/articles/${article.slug}`);
    const image = article.featuredImageUrl || article.ogImage;

    return compactJsonLd({
      '@context': 'https://schema.org',
      '@type': 'Article',
      '@id': `${url}#article`,
      headline: article.metaTitle || article.title,
      description: article.metaDescription || article.excerpt || article.title,
      url,
      ...(image ? { image: this.url(image) } : {}),
      datePublished: toIsoDate(article.publishedAt || article.createdAt),
      dateModified: toIsoDate(article.updatedAt),
      author: {
        '@type': 'Organization',
        name: this.config.siteName,
        url: this.config.siteUrl,
      },
      publisher: { '@id': `${this.config.siteUrl}#organization` },
      mainEntityOfPage: url,
      inLanguage: 'en-US',
      isPartOf: { '@id': `${this.config.siteUrl}#website` },
      about: { '@id': `${this.config.siteUrl}#food-establishment` },
    });
  }

  product(product: ProductSeoContext, resolveImageUrl: (url: string) => string): JsonLd {
    const path = productPathFromContext(product);
    const canonical = this.url(path);
    const images = this.collectProductImages(product, resolveImageUrl);
    const aggregateRating = this.maybeAggregateRating(product);

    if (product.hasVariants && product.variants?.length) {
      const variesBy = (product.options || [])
        .map((option) => OPTION_SCHEMA_MAP[option.name.toLowerCase()])
        .filter((value): value is string => Boolean(value));

      return compactJsonLd({
        '@context': 'https://schema.org',
        '@type': 'ProductGroup',
        '@id': `${canonical}#product`,
        name: product.name,
        description: menuItemSeoDescription(product, this.config.locality, this.config.siteName),
        url: canonical,
        image: images,
        brand: { '@type': 'Brand', name: product.vendor || this.config.siteName },
        productGroupID: product.sku || product.id,
        variesBy,
        aggregateRating,
        hasVariant: product.variants.map((variant) =>
          this.variantProductJsonLd(product, variant, resolveImageUrl)
        ),
      });
    }

    return compactJsonLd({
      '@context': 'https://schema.org',
      '@type': 'Product',
      '@id': `${canonical}#product`,
      name: product.name,
      image: images,
      description: menuItemSeoDescription(product, this.config.locality, this.config.siteName),
      sku: product.sku || product.id,
      mpn: product.manufacturerSku,
      category: product.category,
      brand: { '@type': 'Brand', name: product.vendor || this.config.siteName },
      aggregateRating,
      offers: this.offer(product, product.price, product.stock, canonical),
    });
  }

  menuItem(product: ProductSeoContext, resolveImageUrl: (url: string) => string): JsonLd {
    const path = productPathFromContext(product);
    const canonical = this.url(path);
    const images = this.collectProductImages(product, resolveImageUrl);

    return compactJsonLd({
      '@context': 'https://schema.org',
      '@type': 'MenuItem',
      '@id': `${canonical}#menu-item`,
      name: product.name,
      description: menuItemSeoDescription(product, this.config.locality, this.config.siteName),
      url: canonical,
      ...(images[0] ? { image: images[0] } : {}),
      offers: this.offer(product, product.price, product.stock, canonical),
      ...(product.vendor
        ? {
            provider: {
              '@type': 'FoodEstablishment',
              name: product.vendor,
              parentOrganization: { '@id': `${this.config.siteUrl}#food-establishment` },
            },
          }
        : {}),
    });
  }

  private collectProductImages(
    product: ProductSeoContext,
    resolveImageUrl: (url: string) => string
  ): string[] {
    const urls = [
      product.imageUrl,
      ...(product.mediaUrls || []),
      ...(product.variantImageUrls || []),
    ].filter((url): url is string => Boolean(url));

    return Array.from(new Set(urls)).map((url) => this.url(resolveImageUrl(url)));
  }

  private maybeAggregateRating(product: ProductSeoContext): JsonLd | undefined {
    const ratingValue = Number(product.averageRating);
    const reviewCount = Number(product.reviewCount);
    if (!Number.isFinite(ratingValue) || !Number.isFinite(reviewCount) || reviewCount <= 0) {
      return undefined;
    }
    return {
      '@type': 'AggregateRating',
      ratingValue: Math.min(5, Math.max(1, ratingValue)),
      reviewCount,
    };
  }

  private offer(product: ProductSeoContext, price: number, stock: number, url: string): JsonLd {
    const condition = String(product.metafields?.condition || '').toLowerCase();
    let itemCondition = 'https://schema.org/NewCondition';
    if (condition.includes('used') || condition.includes('vintage')) {
      itemCondition = 'https://schema.org/UsedCondition';
    } else if (condition.includes('refurb')) {
      itemCondition = 'https://schema.org/RefurbishedCondition';
    } else if (condition.includes('damaged')) {
      itemCondition = 'https://schema.org/DamagedCondition';
    }

    const priceValidUntil = product.metafields?.priceValidUntil;
    const validUntil =
      typeof priceValidUntil === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(priceValidUntil)
        ? priceValidUntil
        : undefined;

    return {
      '@type': 'Offer',
      url,
      price: priceFromCents(price),
      priceCurrency: 'USD',
      availability: stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      itemCondition,
      priceValidUntil: validUntil,
      seller: {
        '@type': 'FoodEstablishment',
        '@id': `${this.config.siteUrl}#food-establishment`,
        name: this.config.siteName,
      },
    };
  }

  private variantProductJsonLd(
    product: ProductSeoContext,
    variant: NonNullable<ProductSeoContext['variants']>[number],
    resolveImageUrl: (url: string) => string
  ): JsonLd {
    const image = this.url(resolveImageUrl(variant.imageUrl || product.imageUrl || ''));
    const variantUrl = this.buildVariantUrl(product, variant);

    return compactJsonLd({
      '@type': 'Product',
      name: variant.title ? `${product.name} - ${variant.title}` : product.name,
      sku: variant.sku || variant.id,
      image,
      description: menuItemSeoDescription(product, this.config.locality, this.config.siteName),
      inProductGroupWithID: product.sku || product.id,
      offers: this.offer(product, variant.price, variant.stock, variantUrl),
    });
  }

  private buildVariantUrl(
    product: ProductSeoContext,
    variant: NonNullable<ProductSeoContext['variants']>[number]
  ): string {
    const url = new URL(productPathFromContext(product), this.config.siteUrl);
    product.options?.forEach((option, index) => {
      const value = index === 0 ? variant.option1 : index === 1 ? variant.option2 : variant.option3;
      if (value) {
        const normalized = option.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        url.searchParams.set(normalized || `option-${index + 1}`, value);
      }
    });
    return url.toString();
  }
}

export function productToSeoContext(product: {
  id: string;
  handle?: string;
  name: string;
  seoTitle?: string;
  seoDescription?: string;
  vendor?: string;
  category?: string;
  price: number;
  stock: number;
  sku?: string;
  manufacturerSku?: string;
  imageUrl?: string;
  media?: Array<{ url: string }>;
  variants?: Array<{
    id: string;
    title?: string;
    sku?: string;
    price: number;
    stock: number;
    imageUrl?: string;
    option1?: string;
    option2?: string;
    option3?: string;
  }>;
  hasVariants?: boolean;
  options?: Array<{ name: string }>;
  metafields?: Record<string, unknown>;
  averageRating?: number;
  reviewCount?: number;
}): ProductSeoContext {
  return {
    id: product.id,
    handle: product.handle || product.id,
    name: product.name,
    seoTitle: product.seoTitle,
    seoDescription: product.seoDescription,
    vendor: product.vendor,
    category: product.category,
    price: product.price,
    stock: product.stock,
    sku: product.sku,
    manufacturerSku: product.manufacturerSku,
    imageUrl: product.imageUrl,
    mediaUrls: product.media?.map((m) => m.url),
    variantImageUrls: product.variants?.map((v) => v.imageUrl).filter((u): u is string => Boolean(u)),
    hasVariants: product.hasVariants,
    options: product.options,
    variants: product.variants,
    metafields: product.metafields,
    averageRating: product.averageRating,
    reviewCount: product.reviewCount,
  };
}

export function articleToSeoContext(article: {
  slug: string;
  title: string;
  excerpt: string;
  metaTitle?: string;
  metaDescription?: string;
  ogTitle?: string;
  ogImage?: string;
  featuredImageUrl?: string;
  authorName?: string;
  tags?: string[];
  publishedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}): BlogPostSeoContext {
  return { ...article };
}
