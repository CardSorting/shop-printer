import { describe, expect, it } from 'vitest';
import {
  canonicalPath,
  cleanSeoText,
  clipSeoDescription,
  resolveAbsoluteUrl,
  seoDescription,
} from './rules';

describe('domain/seo/rules', () => {
  it('strips HTML and collapses whitespace', () => {
    expect(cleanSeoText('<p>Hello <strong>hall</strong></p>')).toBe('Hello hall');
  });

  it('clips descriptions at word boundaries', () => {
    const long = 'A'.repeat(200);
    const clipped = clipSeoDescription(long, 160);
    expect(clipped.length).toBeLessThanOrEqual(163);
    expect(clipped.endsWith('...')).toBe(true);
  });

  it('normalizes canonical paths', () => {
    expect(canonicalPath('/products/')).toBe('/products');
    expect(canonicalPath('')).toBe('/');
  });

  it('resolves absolute URLs against site origin', () => {
    expect(resolveAbsoluteUrl('https://woodbine.com', '/menu')).toBe('https://woodbine.com/menu');
  });

  it('prefers primary copy over fallback in seoDescription', () => {
    expect(seoDescription('Primary copy', 'Fallback copy')).toBe('Primary copy');
  });
});
