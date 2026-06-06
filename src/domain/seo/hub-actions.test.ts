import { describe, expect, it } from 'vitest';
import { SEO_HUB_ACTIONS } from './hub-actions';

describe('domain/seo/hub-actions', () => {
  it('defines core merchant navigation actions', () => {
    const ids = SEO_HUB_ACTIONS.map((a) => a.id);
    expect(ids).toContain('seo-overview');
    expect(ids).toContain('seo-fix-listings');
    expect(SEO_HUB_ACTIONS.find((a) => a.id === 'seo-local')?.href).toContain('tab=local');
  });
});
