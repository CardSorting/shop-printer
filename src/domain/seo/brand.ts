/**
 * [LAYER: DOMAIN — SEO]
 * WoodBine brand voice and community narrative — pure constants, no I/O.
 */

import { SEO_DEFAULT_OG_IMAGE } from './constants';

export const WOODBINE_BRAND = {
  name: 'WoodBine',
  legalName: 'Woodbine Food Hall',
  tagline: 'Old Hall. New Flavors.',
  email: 'hello@woodbineslc.com',
  logoGif: '/Woodbine.gif',
  /** Transparent white wordmark — dark / overlay surfaces */
  logoWhite: '/assets/generated/woodbine-logo-white.avif',
  /** Opaque lockup — light surfaces (no CSS filters needed) */
  logoMark: '/images/brand/woodbine-logo-gold.png',
  defaultOgImage: SEO_DEFAULT_OG_IMAGE,
  twitterHandle: '@WoodBine',
  socialProfiles: [
    'https://twitter.com/woodbine',
    'https://instagram.com/woodbine',
    'https://facebook.com/woodbine',
  ],
} as const;

export const SITE_COMMUNITY_HEADLINE = 'Food brings you in. People bring you back.';

export const SITE_COMMUNITY_LINE =
  'A neighborhood table in one of Salt Lake’s artsiest pockets—where vendors, regulars, and first-timers all pull up a chair.';

export const SITE_BELONGING_LINE =
  'No membership, no dress code, no wrong way to show up—solo with a laptop, crew of twelve, or somewhere in between.';

export const SITE_DESCRIPTION =
  'Anchored in a historic and beautifully restored warehouse, WoodBine is a gathering place for cold drinks, full plates, and the best kind of company. Independent vendors and punchy, standout flavors share a creative, industrial room built for lingering—solo, with coworkers, or with the friends you brought and the ones you haven’t met yet.';

export const SITE_ROOM_ESSENCE =
  'WoodBine isn’t a pass-through—it’s a room you return to. Regulars who know your order. Vendors who remember your name. Strangers who become lunch dates. In a restored warehouse at the edge of Salt Lake’s creative district, this is where the city slows down long enough to share a table.';

export const SITE_CTA =
  'Whether you’re looking for a sando and cold beer on a covered patio or an iced latte and a place to do some work, we can answer the call. WoodBine is for casual lunch meetings, private events scaled to your liking, a low-key, lingering dinner with friends, and scrappy games of ping pong or cornhole. Provisions, pals, and a good amount of play—all under one big, barrel roof.';

export const SITE_GATHERING_LINE = 'Come for the food, stay for the people—and the space.';

export const SITE_FOOTER_CLOSER = 'Nine kitchens · one roof · pull up a chair.';

export const SITE_VENDOR_LINE =
  'Every vendor here is a neighbor with a story—small kitchens, big personalities, and flavors worth passing the word about.';

export const SITE_MENU_LINE =
  'Crowd favorites from the vendors regulars rave about—pass the word, pass the plate.';

export const SITE_CART_EMPTY_LINE =
  'Your cart’s empty—but the room isn’t. See what the vendors are serving and what the regulars are ordering.';

export const SITE_NEWSLETTER_LINE =
  'Keep me in the loop on vendor spotlights, community nights, and hall happenings.';

export const SEO_ELEVATOR_PITCH =
  'Salt Lake City’s neighborhood food hall under one restored warehouse roof—walk in, pull up a chair, and let the room do the rest.';
