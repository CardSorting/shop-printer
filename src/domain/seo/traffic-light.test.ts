import { describe, expect, it } from 'vitest';
import { trafficLightFromScore } from './traffic-light';
import { listingRecommendations } from './recommendations';

describe('domain/seo/traffic-light', () => {
  it('maps high scores to green', () => {
    expect(trafficLightFromScore(90).light).toBe('green');
  });

  it('maps low scores to red', () => {
    expect(trafficLightFromScore(20).light).toBe('red');
  });
});

describe('domain/seo/recommendations', () => {
  it('flags missing image for products', () => {
    const recs = listingRecommendations({ name: 'Latte', description: 'Good coffee' }, 'product');
    expect(recs.some((r) => r.id === 'product-photo')).toBe(true);
  });
});
