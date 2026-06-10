import { describe, expect, it } from 'vitest';
import { CATALOG_LCP_PRELOAD_COUNT, selectLcpImageUrls } from './lcp';

describe('catalog LCP selection', () => {
  it('preloads only the first visible product image', () => {
    const urls = selectLcpImageUrls([
      { imageUrl: '/a.jpg' },
      { imageUrl: '/b.jpg' },
      { imageUrl: '/c.jpg' },
    ]);

    expect(urls).toEqual(['/a.jpg']);
    expect(urls.length).toBe(CATALOG_LCP_PRELOAD_COUNT);
  });

  it('dedupes identical image URLs', () => {
    const urls = selectLcpImageUrls([
      { imageUrl: '/a.jpg' },
      { imageUrl: '/a.jpg' },
      { imageUrl: '/b.jpg' },
    ]);

    expect(urls).toEqual(['/a.jpg']);
  });

  it('returns empty when no products', () => {
    expect(selectLcpImageUrls([])).toEqual([]);
  });
});
