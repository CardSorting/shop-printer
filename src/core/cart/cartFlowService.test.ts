import { describe, expect, it, vi } from 'vitest';
import type { Cart } from '@domain/models';
import { CartFlowService } from './cartFlowService';

const cart: Cart = {
  id: 'u1',
  userId: 'u1',
  items: [
    { productId: 'p1', name: 'Item', priceSnapshot: 1000, quantity: 1, imageUrl: '/a.jpg' },
  ],
  discountCode: 'OLD10',
  updatedAt: new Date(),
};

function buildFlow(overrides?: Partial<ConstructorParameters<typeof CartFlowService>[0]>) {
  const store = {
    get: vi.fn().mockResolvedValue(cart),
    clearDiscountCode: vi.fn().mockResolvedValue({ ...cart, discountCode: undefined }),
    add: vi.fn(),
    updateQuantity: vi.fn(),
    remove: vi.fn(),
    clear: vi.fn(),
    updateNote: vi.fn(),
    applyDiscountCode: vi.fn(),
  };
  const validation = {
    validate: vi
      .fn()
      .mockResolvedValueOnce({
        valid: false,
        issues: [{ code: 'discount_expired', message: 'This discount has expired' }],
        requiresRefresh: true,
      })
      .mockResolvedValueOnce({
        valid: true,
        issues: [],
        requiresRefresh: true,
      }),
  };

  const flow = new CartFlowService({
    store: store as any,
    productReadModel: { getProduct: vi.fn() } as any,
    availabilityReader: { resolveStatus: vi.fn() } as any,
    pricingSnapshot: { buildLineSnapshot: vi.fn(), resolveCurrentPrice: vi.fn() } as any,
    validation: validation as any,
    events: { emit: vi.fn() } as any,
    ...overrides,
  });

  return { flow, store, validation };
}

describe('CartFlowService.validateCart', () => {
  it('clears expired discount codes and re-validates cart state', async () => {
    const { flow, store } = buildFlow();

    const result = await flow.validateCart({ userId: 'u1' });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.valid).toBe(true);
      expect(result.data.requiresRefresh).toBe(true);
    }
    expect(store.clearDiscountCode).toHaveBeenCalledWith('u1');
  });
});
