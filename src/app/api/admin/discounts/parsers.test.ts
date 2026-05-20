import { describe, expect, it } from 'vitest';
import { parseDiscountDraft, parseDiscountUpdate } from './parsers';

describe('admin discount parsers', () => {
  it('normalizes free shipping discounts to zero value', () => {
    const draft = parseDiscountDraft({
      code: 'ship-free',
      type: 'free_shipping',
      value: 25,
      status: 'active',
      selectionType: 'all_products',
      minimumRequirementType: 'none',
      eligibilityType: 'everyone',
      startsAt: new Date().toISOString(),
    });

    expect(draft.code).toBe('SHIP-FREE');
    expect(draft.value).toBe(0);
  });

  it('rejects invalid percentage values and date windows', () => {
    expect(() => parseDiscountDraft({
      code: 'TOO-MUCH',
      type: 'percentage',
      value: 101,
      status: 'active',
      selectionType: 'all_products',
      minimumRequirementType: 'none',
      eligibilityType: 'everyone',
      startsAt: '2026-01-02',
    })).toThrow('cannot exceed 100');

    expect(() => parseDiscountUpdate({
      startsAt: '2026-01-02',
      endsAt: '2026-01-01',
    })).toThrow('end date must be after start date');
  });
});
