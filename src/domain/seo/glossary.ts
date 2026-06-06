/**
 * [LAYER: DOMAIN — SEO]
 * Plain-language glossary — Shopify Help Center / Yoast style.
 */

export interface SeoGlossaryEntry {
  id: string;
  term: string;
  definition: string;
}

export const SEO_GLOSSARY: readonly SeoGlossaryEntry[] = [
  {
    id: 'meta-title',
    term: 'Page title',
    definition:
      'The blue clickable headline on Google. Keep it under 60 characters and lead with what people search — dish name, vendor, or "WoodBine food hall."',
  },
  {
    id: 'meta-description',
    term: 'Meta description',
    definition:
      'The gray summary under the title in search results. Aim for two inviting sentences (about 120–160 characters).',
  },
  {
    id: 'handle',
    term: 'URL handle',
    definition:
      'The end of the web address, like /products/cold-brew-latte. Use lowercase words with hyphens — no spaces.',
  },
  {
    id: 'sitemap',
    term: 'Sitemap',
    definition:
      'A list of public pages you want Google to find. WoodBine builds this automatically at /sitemap.xml.',
  },
  {
    id: 'robots',
    term: 'Robots.txt',
    definition:
      'Instructions for search engines. Ours tells Google which pages to crawl and which to skip (like cart and checkout).',
  },
  {
    id: 'noindex',
    term: 'Hidden from Google',
    definition:
      'Some pages (cart, checkout, account) are intentionally not listed in search — same as Shopify and Squarespace.',
  },
  {
    id: 'structured-data',
    term: 'Rich results',
    definition:
      'Extra details Google can show — hours, address, ratings — powered by structured data on your site.',
  },
  {
    id: 'og-image',
    term: 'Share image',
    definition:
      'The photo that appears when someone pastes your link on Instagram, iMessage, or Facebook.',
  },
  {
    id: 'local-signals',
    term: 'Local search signals',
    definition:
      'Mentioning WoodBine and Salt Lake City in titles and descriptions helps Google connect your listing to nearby food searches.',
  },
] as const;
