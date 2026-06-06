import type { Product, ProductOption, ProductVariant } from '@domain/models';
import { sanitizeImageUrl } from './imageSanitizer';

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://woodbine.com';
export const SITE_NAME = 'WoodBine';
export const SITE_TAGLINE = 'Old Hall. New Flavors.';
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
export const SITE_VENDOR_LINE =
  'Every vendor here is a neighbor with a story—small kitchens, big personalities, and flavors worth passing the word about.';
export const SITE_MENU_LINE =
  'Crowd favorites from the vendors regulars rave about—pass the word, pass the plate.';
export const SITE_CART_EMPTY_LINE =
  'Your cart’s empty—but the room isn’t. See what the vendors are serving and what the regulars are ordering.';
export const SITE_NEWSLETTER_LINE =
  'Keep me in the loop on vendor spotlights, community nights, and hall happenings.';

export const SITE_COMMUNITY_PROMISE = [
  {
    title: 'Vendors are neighbors',
    body: 'Every counter in the hall is run by someone from this city—cooking for a room, not a corporate playbook.',
  },
  {
    title: 'The door stays open',
    body: 'Walk in when you’re hungry, thirsty, lonely, or celebrating. No reservation required to belong here.',
  },
  {
    title: 'The room remembers you',
    body: 'Come back once or come back every week—the hall is built for relationships that grow over repeated meals.',
  },
] as const;

export const COMMUNITY_RITUALS = [
  {
    title: 'The Tuesday Table',
    body: 'Same crew, same corner, same order—proof that a food hall can feel like a living room.',
  },
  {
    title: 'Patio Hour',
    body: 'Cold beer, covered seats, and the kind of conversations that stretch longer than intended.',
  },
  {
    title: 'Pass the Word',
    body: 'Regulars telling first-timers which vendor to try—that’s how flavor and community spread here.',
  },
  {
    title: 'Ping Pong Diplomacy',
    body: 'Strangers become teammates. Teams become friends. The hall gets louder in the best way.',
  },
] as const;

export const CART_GUEST_TIERS = [
  { minSubtotal: 0, label: 'New to the Room', color: 'text-gray-600', bg: 'bg-gray-50' },
  { minSubtotal: 10000, label: 'Pulling Up a Chair', color: 'text-green-600', bg: 'bg-green-50' },
  { minSubtotal: 25000, label: 'Hall Regular', color: 'text-blue-600', bg: 'bg-blue-50' },
  { minSubtotal: 50000, label: 'Corner Regular', color: 'text-purple-600', bg: 'bg-purple-50' },
] as const;

export const COMMUNITY_PILLARS = [
  {
    title: 'Regulars',
    subtitle: 'Welcome back',
    body: 'The Tuesday lunch crew. The window-seat regular. The person who always orders last and somehow knows everyone’s name.',
  },
  {
    title: 'Vendors',
    subtitle: 'Neighbors at the stove',
    body: 'Independent kitchens rooted in this city—cooking for a room, not a chain. Stop by their counter and stay for the conversation.',
  },
  {
    title: 'First-Timers',
    subtitle: 'Pull up a chair',
    body: 'Never been? Perfect. The hall was built for discovery—grab a plate, find a seat, and let the room do the rest.',
  },
] as const;

export const ROOM_VOICES = [
  {
    quote: 'I came for a sando and stayed three hours. Ended up on a ping pong team I didn’t know I needed.',
    role: 'First-timer turned regular',
  },
  {
    quote: 'We cook for a room full of people we recognize. That’s the whole reason we’re here.',
    role: 'Vendor at the hall',
  },
  {
    quote: 'It’s the only place in the city where my meeting ran long and nobody rushed us out.',
    role: 'Wednesday lunch crew',
  },
  {
    quote: 'My kid learned to play cornhole here. I learned the names of three vendors. Fair trade.',
    role: 'Weekend regular',
  },
  {
    quote: 'We booked our team off-site here because nobody wanted to leave when the meeting ended.',
    role: 'Local business crew',
  },
] as const;

export const COMMUNITY_CHIPS = [
  'No reservations',
  'All ages welcome',
  'Shared tables',
  'Patio & barrel roof',
  'Ping pong & cornhole',
  'Private events',
  'Walk in anytime',
  'Vendor neighbors',
] as const;

export const DEFAULT_OG_IMAGE = '/og-image.png';

type JsonLd = Record<string, unknown>;

const OPTION_SCHEMA_MAP: Record<string, string> = {
  color: 'https://schema.org/color',
  colour: 'https://schema.org/color',
  size: 'https://schema.org/size',
  age: 'https://schema.org/suggestedAge',
  gender: 'https://schema.org/suggestedGender',
  material: 'https://schema.org/material',
  pattern: 'https://schema.org/pattern',
};

export function absoluteUrl(pathOrUrl: string): string {
  try {
    return new URL(pathOrUrl, SITE_URL).toString();
  } catch {
    return SITE_URL;
  }
}

export function canonicalPath(path: string): string {
  if (!path || path === '/') return '/';
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return cleanPath.replace(/\/+$/, '');
}

export function productPath(product: Product): string {
  return `/products/${product.handle || product.id}`;
}

export function cleanSeoText(value?: string | null): string {
  return (value || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function seoDescription(value?: string | null, fallback = '', maxLength = 160): string {
  const text = cleanSeoText(value) || cleanSeoText(fallback);
  if (text.length <= maxLength) return text;

  const clipped = text.slice(0, maxLength + 1);
  const lastSpace = clipped.lastIndexOf(' ');
  return `${clipped.slice(0, lastSpace > 80 ? lastSpace : maxLength).trim()}...`;
}

export function productSeoTitle(product: Product): string {
  return product.seoTitle || `${product.name} | ${SITE_NAME}`;
}

export function productSeoDescription(product: Product): string {
  return seoDescription(
    product.seoDescription,
    `${product.description} ${product.category ? `Shop ${product.category} from ${SITE_NAME}.` : ''}`
  );
}

export function productImages(product: Product): string[] {
  const urls = [
    product.imageUrl,
    ...(product.media || []).map((media) => media.url),
    ...(product.variants || []).map((variant) => variant.imageUrl),
  ].filter((url): url is string => Boolean(url));

  return Array.from(new Set(urls))
    .map(url => sanitizeImageUrl(url))
    .map(absoluteUrl);
}

function priceFromCents(cents: number): string {
  return (cents / 100).toFixed(2);
}

function optionQueryName(option: ProductOption, index: number): string {
  const normalized = option.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return normalized || `option-${index + 1}`;
}

function variantOptionValue(variant: ProductVariant, index: number): string | undefined {
  if (index === 0) return variant.option1;
  if (index === 1) return variant.option2;
  if (index === 2) return variant.option3;
  return undefined;
}

function variantUrl(product: Product, variant: ProductVariant): string {
  const url = new URL(productPath(product), SITE_URL);
  product.options?.forEach((option, index) => {
    const value = variantOptionValue(variant, index);
    if (value) url.searchParams.set(optionQueryName(option, index), value);
  });
  return url.toString();
}

function itemCondition(product: Product): string {
  const condition = String(product.metafields?.condition || '').toLowerCase();
  if (condition.includes('used') || condition.includes('vintage')) return 'https://schema.org/UsedCondition';
  if (condition.includes('refurb')) return 'https://schema.org/RefurbishedCondition';
  if (condition.includes('damaged')) return 'https://schema.org/DamagedCondition';
  return 'https://schema.org/NewCondition';
}

function maybeAggregateRating(product: Product): JsonLd | undefined {
  const ratingValue = Number((product as Product & { averageRating?: number }).averageRating);
  const reviewCount = Number((product as Product & { reviewCount?: number }).reviewCount);

  if (!Number.isFinite(ratingValue) || !Number.isFinite(reviewCount) || reviewCount <= 0) {
    return undefined;
  }

  return {
    '@type': 'AggregateRating',
    ratingValue: Math.min(5, Math.max(1, ratingValue)),
    reviewCount,
  };
}

function maybePriceValidUntil(product: Product): string | undefined {
  const value = product.metafields?.priceValidUntil;
  if (typeof value !== 'string') return undefined;
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : undefined;
}

function offer(product: Product, price: number, stock: number, url: string): JsonLd {
  return {
    '@type': 'Offer',
    url,
    price: priceFromCents(price),
    priceCurrency: 'USD',
    availability: stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
    itemCondition: itemCondition(product),
    priceValidUntil: maybePriceValidUntil(product),
    seller: {
      '@type': 'Organization',
      name: SITE_NAME,
    },
  };
}

function compactJsonLd<T extends JsonLd>(value: T): T {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => {
      if (entry === undefined || entry === null || entry === '') return false;
      if (Array.isArray(entry) && entry.length === 0) return false;
      return true;
    })
  ) as T;
}

function variantProductJsonLd(product: Product, variant: ProductVariant): JsonLd {
  const image = absoluteUrl(variant.imageUrl || product.imageUrl);

  return compactJsonLd({
    '@type': 'Product',
    name: variant.title ? `${product.name} - ${variant.title}` : product.name,
    sku: variant.sku || variant.id,
    image,
    description: productSeoDescription(product),
    inProductGroupWithID: product.sku || product.id,
    offers: offer(product, variant.price, variant.stock, variantUrl(product, variant)),
  });
}

export function productJsonLd(product: Product): JsonLd {
  const images = productImages(product);
  const canonical = absoluteUrl(productPath(product));
  const aggregateRating = maybeAggregateRating(product);

  if (product.hasVariants && product.variants?.length) {
    const variesBy = (product.options || [])
      .map((option) => OPTION_SCHEMA_MAP[option.name.toLowerCase()])
      .filter((value): value is string => Boolean(value));

    return compactJsonLd({
      '@context': 'https://schema.org',
      '@type': 'ProductGroup',
      '@id': `${canonical}#product`,
      name: product.name,
      description: productSeoDescription(product),
      url: canonical,
      image: images,
      brand: { '@type': 'Brand', name: product.vendor || SITE_NAME },
      productGroupID: product.sku || product.id,
      variesBy,
      aggregateRating,
      hasVariant: product.variants.map((variant) => variantProductJsonLd(product, variant)),
    });
  }

  return compactJsonLd({
    '@context': 'https://schema.org',
    '@type': 'Product',
    '@id': `${canonical}#product`,
    name: product.name,
    image: images,
    description: productSeoDescription(product),
    sku: product.sku || product.id,
    mpn: product.manufacturerSku,
    category: product.category,
    brand: {
      '@type': 'Brand',
      name: product.vendor || SITE_NAME,
    },
    aggregateRating,
    offers: offer(product, product.price, product.stock, canonical),
  });
}

export function breadcrumbJsonLd(items: Array<{ name: string; path: string }>): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

export function organizationJsonLd(): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${SITE_URL}#organization`,
    name: SITE_NAME,
    url: SITE_URL,
    logo: absoluteUrl('/logo.png'),
    image: absoluteUrl(DEFAULT_OG_IMAGE),
    description: SITE_DESCRIPTION,
    email: 'hello@woodbine.com',
    sameAs: [
      'https://twitter.com/woodbine',
      'https://instagram.com/woodbine',
      'https://facebook.com/woodbine',
    ],
  };
}
