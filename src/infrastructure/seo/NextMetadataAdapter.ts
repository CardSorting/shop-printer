/**
 * [LAYER: INFRASTRUCTURE — SEO]
 * Adapts core SEO resolution to Next.js Metadata objects.
 */

import type { Metadata } from 'next';
import { geoMetaFromConfig } from '@domain/seo/rules';
import type { ResolvedSeoPageMetadata, SeoPageMetadataInput, SeoSiteConfig } from '@domain/seo/types';
import { PageMetadataService } from '@core/seo/PageMetadataService';
import { resolveAbsoluteUrl } from '@domain/seo/rules';

export function toNextMetadata(resolved: ResolvedSeoPageMetadata, config: SeoSiteConfig): Metadata {
  return {
    title: resolved.title,
    description: resolved.description,
    keywords: resolved.keywords,
    alternates: { canonical: resolved.canonical },
    openGraph: {
      type: resolved.type,
      locale: 'en_US',
      url: resolveAbsoluteUrl(config.siteUrl, resolved.canonical),
      siteName: config.siteName,
      title: resolved.socialTitle,
      description: resolved.description,
      images: resolved.ogImages,
      ...(resolved.type === 'article' && resolved.publishedTime ? { publishedTime: resolved.publishedTime } : {}),
      ...(resolved.type === 'article' && resolved.modifiedTime ? { modifiedTime: resolved.modifiedTime } : {}),
      ...(resolved.type === 'article' && resolved.authors?.length ? { authors: resolved.authors } : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title: resolved.socialTitle,
      description: resolved.description,
      images: resolved.resolvedImageUrls,
      creator: config.twitterHandle,
      site: config.twitterHandle,
    },
    robots: resolved.noIndex
      ? { index: false, follow: true }
      : {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            'max-video-preview': -1,
            'max-image-preview': 'large',
            'max-snippet': -1,
          },
        },
  };
}

export function buildNextPageMetadata(input: SeoPageMetadataInput, config: SeoSiteConfig): Metadata {
  const service = new PageMetadataService(config);
  return toNextMetadata(service.resolve(input), config);
}

export function buildRootLayoutMetadata(config: SeoSiteConfig): Metadata {
  const pages = new PageMetadataService(config);
  const home = pages.resolve(pages.home());

  return {
    metadataBase: new URL(config.siteUrl),
    title: {
      default: typeof home.title === 'string' ? home.title : home.title.absolute,
      template: `%s | ${config.siteName}`,
    },
    description: home.description,
    keywords: [...home.keywords],
    applicationName: config.siteName,
    category: 'food',
    authors: [{ name: `${config.siteName} Team`, url: config.siteUrl }],
    creator: config.siteName,
    publisher: config.siteName,
    formatDetection: {
      email: false,
      address: false,
      telephone: false,
    },
    icons: {
      icon: '/icon.png',
      shortcut: '/favicon.png',
      apple: '/icon.png',
    },
    openGraph: {
      type: 'website',
      locale: 'en_US',
      url: config.siteUrl,
      siteName: config.siteName,
      title: typeof home.title === 'string' ? home.title : home.title.absolute,
      description: home.description,
      images: pages.defaultOgImages(),
    },
    twitter: {
      card: 'summary_large_image',
      title: typeof home.title === 'string' ? home.title : home.title.absolute,
      description: home.description,
      images: pages.defaultOgImages().map((image) => image.url),
      creator: config.twitterHandle,
      site: config.twitterHandle,
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
    other: geoMetaFromConfig(config),
  };
}
