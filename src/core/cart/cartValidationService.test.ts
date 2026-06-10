import { describe, expect, it, vi } from 'vitest';
import type { Cart } from '@domain/models';
import { CartValidationService } from './cartValidationService';
import { InventoryAvailabilityReader } from './inventoryAvailabilityReader';
import { PricingSnapshotService } from './pricingSnapshotService';
import { ProductReadModel } from './productReadModel';

const product = {
  id: 'p1',
  name: 'Poster',
  description: '',
  price: 2000,
  category: 'Art',
  stock: 5,
  imageUrl: '/a.jpg',
  media: [],
  status: 'active',
  createdAt: new Date(),
  updatedAt: new Date(),
} as const;

function buildCart(items: Cart['items']): Cart {
  return {
    id: 'u1',
    userId: 'u1',
    items,
    updatedAt: new Date(),
  };
}

describe('CartValidationService', () => {
  it('flags pricing_changed when live price differs from snapshot', async () => {
    const productRepo = { getById: vi.fn().mockResolvedValue({ ...product, price: 2500 }) };
    const validation = new CartValidationService({
      productReadModel: new ProductReadModel(productRepo as any),
      availabilityReader: new InventoryAvailabilityReader({}),
      pricingSnapshot: new PricingSnapshotService(),
    });

    const result = await validation.validate(
      buildCart([
        {
          productId: 'p1',
          name: 'Poster',
          priceSnapshot: 2000,
          quantity: 1,
          imageUrl: '/a.jpg',
        },
      ]),
      'u1',
    );

    expect(result.valid).toBe(false);
    expect(result.issues.some((issue) => issue.code === 'pricing_changed')).toBe(true);
    expect(result.requiresRefresh).toBe(true);
  });

  it('flags product_unavailable for archived products', async () => {
    const productRepo = {
      getById: vi.fn().mockResolvedValue({ ...product, status: 'archived' }),
    };
    const validation = new CartValidationService({
      productReadModel: new ProductReadModel(productRepo as any),
      availabilityReader: new InventoryAvailabilityReader({}),
      pricingSnapshot: new PricingSnapshotService(),
    });

    const result = await validation.validate(
      buildCart([
        {
          productId: 'p1',
          name: 'Poster',
          priceSnapshot: 2000,
          quantity: 1,
          imageUrl: '/a.jpg',
        },
      ]),
      'u1',
    );

    expect(result.issues.some((issue) => issue.code === 'product_unavailable')).toBe(true);
  });
});
