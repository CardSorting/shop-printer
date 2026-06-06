/**
 * [LAYER: DOMAIN — SEO]
 * Canonical WoodBine local business defaults — used in .env.example, dev fallbacks, and setup wizard.
 * Replace street/postal with your verified address before production launch.
 */

export const WOODBINE_LOCAL_BUSINESS_DEFAULTS = {
  siteUrl: 'https://woodbine.com',
  street: '235 S 500 W',
  city: 'Salt Lake City',
  region: 'UT',
  neighborhood: 'Salt Lake arts district',
  postal: '84101',
  phone: '(801) 555-0199',
  lat: 40.7628,
  lng: -111.9011,
  opens: '11:00',
  closes: '22:00',
} as const;

export type WoodbineLocalBusinessDefaults = typeof WOODBINE_LOCAL_BUSINESS_DEFAULTS;
