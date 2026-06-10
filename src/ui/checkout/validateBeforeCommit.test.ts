import { describe, expect, it } from 'vitest';
import { gateCheckoutCommit } from './validateBeforeCommit';

describe('gateCheckoutCommit', () => {
  it('blocks when validation fails', () => {
    const gate = gateCheckoutCommit({
      ok: true,
      data: {
        valid: false,
        requiresRefresh: true,
        issues: [{ code: 'pricing_changed', message: 'Price changed for Poster.' }],
      },
    });
    expect(gate.blocked).toBe(true);
    if (gate.blocked) {
      expect(gate.message).toMatch(/Refresh your cart/);
    }
  });

  it('allows commit when cart is valid', () => {
    const gate = gateCheckoutCommit({
      ok: true,
      data: { valid: true, issues: [], requiresRefresh: false },
    });
    expect(gate).toEqual({ blocked: false });
  });
});
