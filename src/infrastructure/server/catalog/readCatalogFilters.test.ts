import { describe, expect, it } from 'vitest';
import { readCatalogFilters } from './readCatalogFilters';

describe('readCatalogFilters', () => {
  it('parses canonical q and sort_by params', () => {
    expect(readCatalogFilters({ sort_by: 'price_asc', q: '  honey  ' })).toEqual({
      sortBy: 'price_asc',
      search: 'honey',
    });
  });

  it('falls back to legacy search param', () => {
    expect(readCatalogFilters({ search: 'tea', sort: 'name' })).toEqual({
      sortBy: 'name',
      search: 'tea',
    });
  });

  it('rejects unknown sort values', () => {
    expect(readCatalogFilters({ sort_by: 'invalid' })).toEqual({
      sortBy: 'newest',
      search: '',
    });
  });
});
