import { describe, expect, it } from 'vitest';
import { PRODUCT_DETAIL_LCP_PRELOAD_COUNT } from './constants';
import { selectProductLcpImages } from './selectProductLcpImages';

describe('product detail LCP selection', () => {
  it('preloads only the primary product image', () => {
    const urls = selectProductLcpImages({
      imageUrl: '/primary.jpg',
    });

    expect(urls).toEqual(['/primary.jpg']);
    expect(urls.length).toBe(PRODUCT_DETAIL_LCP_PRELOAD_COUNT);
  });

  it('ignores gallery media — primary only', () => {
    const urls = selectProductLcpImages({
      imageUrl: '/primary.jpg',
    });

    expect(urls).not.toContain('/gallery.jpg');
  });
});
