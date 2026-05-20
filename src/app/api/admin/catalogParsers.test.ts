import { describe, expect, it } from 'vitest';
import {
  parseCollectionDraft,
  parseCollectionListOptions,
  parseProductCategoryInput,
  parseSupplierDraft,
  parseSupplierListOptions,
} from './catalogParsers';

describe('admin catalog parsers', () => {
  it('normalizes collection handles and bounds list limits', () => {
    const draft = parseCollectionDraft({ name: ' Rare Cards ', handle: 'Rare Cards!!', status: 'draft' });
    const options = parseCollectionListOptions(new URLSearchParams('status=draft&limit=500'));

    expect(draft).toMatchObject({ name: 'Rare Cards', handle: 'rare-cards', status: 'draft' });
    expect(options).toEqual({ status: 'draft', limit: 100 });
  });

  it('rejects unsafe collection status and empty taxonomy names', () => {
    expect(() => parseCollectionDraft({ name: 'Cards', status: 'published' })).toThrow('Collection status is invalid');
    expect(() => parseProductCategoryInput({ name: '' })).toThrow('name is required');
  });

  it('normalizes supplier contact fields and rejects non-http URLs', () => {
    const draft = parseSupplierDraft({
      name: ' Acme ',
      email: 'ORDERS@EXAMPLE.COM',
      website: 'https://supplier.example/path',
      address: { street: '1 Test', city: 'Denver', state: 'CO', zip: '80202', country: 'us' },
    });
    const options = parseSupplierListOptions(new URLSearchParams('query=acme&limit=0'));

    expect(draft.email).toBe('orders@example.com');
    expect(draft.address?.country).toBe('US');
    expect(options).toEqual({ query: 'acme', limit: 1 });
    expect(() => parseSupplierDraft({ name: 'Acme', website: 'javascript:alert(1)' })).toThrow('website must use http or https');
  });
});
