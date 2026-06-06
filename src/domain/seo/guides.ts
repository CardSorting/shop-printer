/**
 * [LAYER: DOMAIN — SEO]
 * Plain-language guides for non-technical merchants (Shopify Help Center style).
 */

export interface SeoGuideEntry {
  id: string;
  title: string;
  summary: string;
  steps: string[];
  icon: 'search' | 'map' | 'share' | 'menu' | 'shield';
}

export const SEO_GUIDES: readonly SeoGuideEntry[] = [
  {
    id: 'what-is-seo',
    title: 'What is search visibility?',
    summary:
      'When someone searches “food hall Salt Lake” or “WoodBine menu,” search visibility is what helps WoodBine show up — and look trustworthy when it does.',
    steps: [
      'Google reads your page titles and short descriptions.',
      'Clear words about location, vendors, and the hall help you rank locally.',
      'Good listings get more clicks — even if you are not in the #1 spot.',
    ],
    icon: 'search',
  },
  {
    id: 'search-listing',
    title: 'Edit a search engine listing',
    summary:
      'Every menu item and story can have its own listing — the blue link and gray text people see on Google.',
    steps: [
      'Open a product or blog post in admin.',
      'Scroll to “Search engine listing.”',
      'Use “Suggest improvements” or write your own title and description.',
      'Check the live preview before saving.',
    ],
    icon: 'menu',
  },
  {
    id: 'local-maps',
    title: 'Show up on maps & “near me”',
    summary:
      'Local search uses your address, phone, and hours — the same details people expect on Google Maps.',
    steps: [
      'Ask your developer to add address and hours in site settings (.env).',
      'Keep hours accurate — walk-ins are a core part of WoodBine.',
      'Claim your Google Business Profile separately at business.google.com.',
    ],
    icon: 'map',
  },
  {
    id: 'social-sharing',
    title: 'Look good when shared',
    summary:
      'When someone shares a link on Instagram or text, the title, description, and image come from your SEO listing.',
    steps: [
      'Add a photo to menu items and blog stories.',
      'Write descriptions that sound like an invitation, not a spreadsheet.',
      'Preview the Facebook and X tabs before publishing.',
    ],
    icon: 'share',
  },
  {
    id: 'private-pages',
    title: 'Why some pages stay hidden',
    summary:
      'Cart, checkout, and account pages are intentionally kept out of Google — same approach as Shopify and Squarespace.',
    steps: [
      'Search results stay focused on the hall, menu, and visit info.',
      'Private pages still work for customers — they are just not advertised to Google.',
      'Your sitemap lists only public pages worth finding.',
    ],
    icon: 'shield',
  },
] as const;

export const SEO_EXTERNAL_TOOLS = [
  {
    id: 'google-search-console',
    label: 'Google Search Console',
    description: 'See how Google finds your site — free from Google.',
    href: 'https://search.google.com/search-console',
  },
  {
    id: 'google-business',
    label: 'Google Business Profile',
    description: 'Manage map pin, hours, and reviews.',
    href: 'https://business.google.com',
  },
  {
    id: 'bing-webmaster',
    label: 'Bing Webmaster Tools',
    description: 'Optional — covers Bing and Yahoo search.',
    href: 'https://www.bing.com/webmasters',
  },
] as const;

export type SeoHubTabId = 'overview' | 'listings' | 'local' | 'learn';

export interface SeoHubTab {
  id: SeoHubTabId;
  label: string;
  description: string;
}

export const SEO_HUB_TABS: readonly SeoHubTab[] = [
  {
    id: 'overview',
    label: 'Overview',
    description: 'Site health and pages Google can find',
  },
  {
    id: 'listings',
    label: 'Listings',
    description: 'Menu items and stories that need attention',
  },
  {
    id: 'local',
    label: 'Local presence',
    description: 'Maps, address, and hours',
  },
  {
    id: 'learn',
    label: 'Learn',
    description: 'Plain-language guides — no jargon',
  },
] as const;
