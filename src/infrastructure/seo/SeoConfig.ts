/**
 * [LAYER: INFRASTRUCTURE — SEO]
 * Environment-backed site configuration for the SEO engine.
 */

import { WOODBINE_BRAND } from '@domain/seo/brand';
import { WOODBINE_LOCAL_BUSINESS_DEFAULTS } from '@domain/seo/local-business-defaults';
import type { SeoSiteConfig } from '@domain/seo/types';

function parseGeo(value?: string, fallback?: number): number | undefined {
  if (value) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function envOrDefault(value: string | undefined, fallback: string): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : fallback;
}

export function createSeoConfigFromEnv(env: NodeJS.ProcessEnv = process.env): SeoSiteConfig {
  const defaults = WOODBINE_LOCAL_BUSINESS_DEFAULTS;

  return {
    siteUrl: envOrDefault(env.NEXT_PUBLIC_SITE_URL, defaults.siteUrl),
    siteName: WOODBINE_BRAND.name,
    tagline: WOODBINE_BRAND.tagline,
    defaultOgImage: WOODBINE_BRAND.defaultOgImage,
    email: WOODBINE_BRAND.email,
    locality: envOrDefault(env.NEXT_PUBLIC_BUSINESS_CITY, defaults.city),
    region: envOrDefault(env.NEXT_PUBLIC_BUSINESS_REGION, defaults.region),
    neighborhood: envOrDefault(env.NEXT_PUBLIC_BUSINESS_NEIGHBORHOOD, defaults.neighborhood),
    country: 'US',
    street: envOrDefault(env.NEXT_PUBLIC_BUSINESS_STREET, defaults.street),
    postal: envOrDefault(env.NEXT_PUBLIC_BUSINESS_POSTAL, defaults.postal),
    phone: envOrDefault(env.NEXT_PUBLIC_BUSINESS_PHONE, defaults.phone),
    geoLat: parseGeo(env.NEXT_PUBLIC_BUSINESS_LAT, defaults.lat),
    geoLng: parseGeo(env.NEXT_PUBLIC_BUSINESS_LNG, defaults.lng),
    hoursOpens: envOrDefault(env.NEXT_PUBLIC_BUSINESS_OPENS, defaults.opens),
    hoursCloses: envOrDefault(env.NEXT_PUBLIC_BUSINESS_CLOSES, defaults.closes),
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
