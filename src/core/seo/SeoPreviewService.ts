/**
 * [LAYER: CORE — SEO]
 * Builds familiar Google / social / X previews for merchant-facing UI.
 */

import { SEO_TITLE_MAX } from '@domain/seo/constants';
import { buildDefaultSiteDescription, buildDefaultSiteTitle, cleanSeoText } from '@domain/seo/rules';
import type { SeoListingPreviewBundle, SeoPreviewInput } from '@domain/seo/preview';
import type { SeoSiteConfig } from '@domain/seo/types';

export class SeoPreviewService {
  constructor(private readonly config: SeoSiteConfig) {}

  listingPreview(input: SeoPreviewInput): SeoListingPreviewBundle {
    const title = cleanSeoText(input.seoTitle) || cleanSeoText(input.name) || 'Untitled page';
    const description =
      cleanSeoText(input.seoDescription) ||
      cleanSeoText(input.description) ||
      'Add a meta description to help customers find this page in search results.';
    const handle = cleanSeoText(input.handle) || 'page-handle';
    const host = input.siteHost.replace(/^https?:\/\//, '').replace(/\/$/, '');
    const path = `${input.pathPrefix}/${handle}`.replace(/\/+/g, '/');
    const displayTitle = title.length > SEO_TITLE_MAX ? `${title.slice(0, SEO_TITLE_MAX - 1)}…` : title;
    const socialTitle = `${displayTitle} | ${input.siteName}`;

    return {
      google: {
        siteLabel: host,
        breadcrumb: `${input.pathPrefix.replace(/^\//, '')} › ${handle}`,
        title: socialTitle,
        description,
        url: `https://${host}${path}`,
      },
      social: {
        siteLabel: host.toUpperCase(),
        title: displayTitle,
        description,
        imageUrl: input.imageUrl,
        url: `https://${host}${path}`,
      },
      twitter: {
        siteLabel: this.config.twitterHandle,
        title: displayTitle,
        description,
        imageUrl: input.imageUrl,
        card: input.imageUrl ? 'summary_large_image' : 'summary',
      },
    };
  }

  siteHostLabel(): string {
    return this.config.siteUrl.replace(/^https?:\/\//, '').replace(/\/$/, '');
  }

  homepagePreview(): import('@domain/seo/preview').SeoGooglePreview {
    const host = this.siteHostLabel();
    return {
      siteLabel: host,
      breadcrumb: 'Homepage',
      title: buildDefaultSiteTitle(),
      description: buildDefaultSiteDescription(),
      url: this.config.siteUrl,
    };
  }
}
