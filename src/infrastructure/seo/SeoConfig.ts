/**
 * [LAYER: INFRASTRUCTURE — SEO]
 * Environment-backed site configuration for the SEO engine.
 */

import { WOODBINE_BRAND } from '@domain/seo/brand';
import type { SeoSiteConfig } from '@domain/seo/types';

function parseGeo(value?: string): number | undefined {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function createSeoConfigFromEnv(env: NodeJS.ProcessEnv = process.env): SeoSiteConfig {
  return {
    siteUrl: env.NEXT_PUBLIC_SITE_URL || 'https://woodbine.com',
    siteName: WOODBINE_BRAND.name,
    tagline: WOODBINE_BRAND.tagline,
    defaultOgImage: WOODBINE_BRAND.defaultOgImage,
    email: WOODBINE_BRAND.email,
    locality: env.NEXT_PUBLIC_BUSINESS_CITY || 'Salt Lake City',
    region: env.NEXT_PUBLIC_BUSINESS_REGION || 'UT',
    neighborhood: env.NEXT_PUBLIC_BUSINESS_NEIGHBORHOOD || 'Salt Lake arts district',
    country: 'US',
    street: env.NEXT_PUBLIC_BUSINESS_STREET || undefined,
    postal: env.NEXT_PUBLIC_BUSINESS_POSTAL || undefined,
    phone: env.NEXT_PUBLIC_BUSINESS_PHONE || undefined,
    geoLat: parseGeo(env.NEXT_PUBLIC_BUSINESS_LAT),
    geoLng: parseGeo(env.NEXT_PUBLIC_BUSINESS_LNG),
    hoursOpens: env.NEXT_PUBLIC_BUSINESS_OPENS || undefined,
    hoursCloses: env.NEXT_PUBLIC_BUSINESS_CLOSES || undefined,
    twitterHandle: WOODBINE_BRAND.twitterHandle,
    socialProfiles: WOODBINE_BRAND.socialProfiles,
  };
}

let cachedConfig: SeoSiteConfig | null = null;

export function getSeoConfig(): SeoSiteConfig {
  if (!cachedConfig) {
    cachedConfig = createSeoConfigFromEnv();
  }
  return cachedConfig;
}

export function resetSeoConfigForTests(): void {
  cachedConfig = null;
}
