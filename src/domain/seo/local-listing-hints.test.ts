import { describe, expect, it } from 'vitest';
import { auditLocalListingSignals, localListingRecommendations } from './local-listing-hints';

describe('domain/seo/local-listing-hints', () => {
  it('flags missing brand and locality signals', () => {
    const signals = auditLocalListingSignals({
      name: 'Cold Brew Latte',
      seoDescription: 'Iced coffee with oat milk.',
    });
    expect(signals.find((s) => s.id === 'brand-name')?.met).toBe(false);
    expect(signals.find((s) => s.id === 'locality')?.met).toBe(false);
    expect(localListingRecommendations({ name: 'Tacos' }).length).toBeGreaterThan(0);
  });

  it('passes when WoodBine and Salt Lake are present', () => {
    const signals = auditLocalListingSignals({
      name: 'WoodBine Patio Favorites',
      seoDescription: 'Seasonal dishes at WoodBine food hall in Salt Lake City.',
    });
    expect(signals.every((s) => s.met)).toBe(true);
  });
});
