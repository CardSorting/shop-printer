import { describe, expect, it } from 'vitest';
import { resolveCollectionPageDescription, resolveCollectionPageTitle } from './storefront-listing';

describe('domain/seo/storefront-listing', () => {
  it('prefers custom SEO fields over defaults', () => {
    const input = {
      name: 'Patio Favorites',
      slug: 'patio-favorites',
      description: 'Sunny-day picks',
      seoTitle: 'Patio Favorites — WoodBine Food Hall',
      seoDescription: 'Best patio dishes and drinks at WoodBine in Salt Lake City.',
    };
    expect(resolveCollectionPageTitle(input)).toBe('Patio Favorites — WoodBine Food Hall');
    expect(resolveCollectionPageDescription(input, 'WoodBine')).toBe(
      'Best patio dishes and drinks at WoodBine in Salt Lake City.'
    );
  });

  it('falls back to name and generated description', () => {
    const input = { name: 'Appetizers', slug: 'appetizers', description: 'Small plates' };
    expect(resolveCollectionPageTitle(input)).toBe('Appetizers');
    expect(resolveCollectionPageDescription(input, 'WoodBine')).toBe('Small plates');
  });
});
