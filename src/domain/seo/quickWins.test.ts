import { describe, expect, it } from 'vitest';
import { buildQuickWins } from './quickWins';
import type { CatalogListingAuditItem } from './catalog';

const sampleItem = (overrides: Partial<CatalogListingAuditItem>): CatalogListingAuditItem => ({
  id: '1',
  kind: 'product',
  name: 'Test',
  score: 50,
  grade: 'needs-work',
  path: '/products/test',
  editPath: '/admin/products/1/edit',
  ...overrides,
});

describe('buildQuickWins', () => {
  it('returns lowest scores first', () => {
    const wins = buildQuickWins([
      sampleItem({ id: 'a', score: 70, name: 'Better' }),
      sampleItem({ id: 'b', score: 30, name: 'Worst' }),
    ]);
    expect(wins[0]?.title).toBe('Worst');
  });

  it('caps at max items', () => {
    const items = Array.from({ length: 10 }, (_, i) => sampleItem({ id: String(i), score: i * 5 }));
    expect(buildQuickWins(items, 3)).toHaveLength(3);
  });
});
