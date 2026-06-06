import { describe, expect, it } from 'vitest';
import {
  adminHelpSeoFilterHref,
  adminListSeoFilterHref,
  helpArticleEditHref,
  parseSeoNeedsWorkFilter,
  taxonomyCategoryEditHref,
} from './admin-routes';

describe('domain/seo/admin-routes', () => {
  it('builds taxonomy deep links', () => {
    expect(taxonomyCategoryEditHref('cat-123')).toBe('/admin/taxonomy?edit=cat-123');
  });

  it('appends seo filter to admin list routes', () => {
    expect(adminListSeoFilterHref('/admin/products')).toBe('/admin/products?seo=needs-work');
    expect(adminListSeoFilterHref('/admin/blog?tab=published')).toBe(
      '/admin/blog?tab=published&seo=needs-work'
    );
  });

  it('builds help article admin edit links', () => {
    expect(helpArticleEditHref('art-42')).toBe('/admin/blog/art-42');
    expect(adminHelpSeoFilterHref()).toBe('/admin/support?seo=needs-work');
  });

  it('parses seo needs-work filter from search params', () => {
    const params = new URLSearchParams('seo=needs-work');
    expect(parseSeoNeedsWorkFilter(params)).toBe(true);
    expect(parseSeoNeedsWorkFilter(new URLSearchParams('seo=all'))).toBe(false);
  });
});
