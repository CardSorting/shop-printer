import { beforeEach, describe, expect, it, vi } from 'vitest';
import { InsufficientStockError } from '@domain/errors';
import type { Cart } from '@domain/models';
import { CartFlowService } from './cartFlowService';

vi.mock('@infrastructure/firebase/bridge', () => ({
  runTransaction: vi.fn((_db, operation) => operation({})),
  getUnifiedDb: vi.fn(() => ({})),
}));

const product = {
  id: 'p1',
  name: 'Product 1',
  price: 1_000,
  stock: 10,
  imageUrl: '/product.jpg',
  status: 'active',
  variants: [],
};

const persistedCart: Cart = {
  id: 'u1',
  userId: 'u1',
  items: [
    { productId: 'p1', name: 'Product 1', priceSnapshot: 1_000, quantity: 1, imageUrl: '/product.jpg' },
  ],
  note: 'Keep this note',
  discountCode: 'OLD10',
  updatedAt: new Date(),
};

function buildFlow(options: {
  cart?: Cart | null;
  product?: typeof product | null;
  inventoryError?: Error;
  validation?: { validate: ReturnType<typeof vi.fn> };
} = {}) {
  const cartRepo = {
    getByUserId: vi.fn().mockResolvedValue(options.cart === undefined ? persistedCart : options.cart),
    save: vi.fn(),
    clear: vi.fn(),
  };
  const productReadModel = {
    getProduct: vi.fn().mockResolvedValue(options.product === undefined ? product : options.product),
  };
  const availabilityReader = {
    assertAvailable: options.inventoryError
      ? vi.fn().mockRejectedValue(options.inventoryError)
      : vi.fn().mockResolvedValue(undefined),
    resolveStatus: vi.fn().mockResolvedValue('in_stock'),
  };
  const validation = options.validation ?? {
    validate: vi.fn().mockResolvedValue({ valid: true, issues: [], requiresRefresh: false }),
  };
  const events = { emit: vi.fn() };
  const flow = new CartFlowService({
    cartRepo: cartRepo as any,
    productReadModel: productReadModel as any,
    availabilityReader: availabilityReader as any,
    pricingSnapshot: { buildLineSnapshot: vi.fn(), resolveCurrentPrice: vi.fn() } as any,
    validation: validation as any,
    events: events as any,
  });

  return { flow, cartRepo, productReadModel, availabilityReader, validation, events };
}

describe('CartFlowService', () => {
  beforeEach(() => vi.clearAllMocks());

  it('adds through the application flow and preserves cart metadata', async () => {
    const { flow, cartRepo } = buildFlow();

    const result = await flow.addItem({ userId: 'u1', productId: 'p1', quantity: 2 });

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.items[0].quantity).toBe(3);
    expect(cartRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ note: 'Keep this note', discountCode: 'OLD10' }),
      expect.anything(),
    );
  });

  it('returns a product-not-found result without persisting', async () => {
    const { flow, cartRepo } = buildFlow({ product: null });

    const result = await flow.addItem({ userId: 'u1', productId: 'missing', quantity: 1 });

    expect(result).toMatchObject({ ok: false, code: 'product_not_found' });
    expect(cartRepo.save).not.toHaveBeenCalled();
  });

  it('returns an insufficient-stock result without persisting', async () => {
    const { flow, cartRepo } = buildFlow({
      inventoryError: new InsufficientStockError('p1', 2, 1),
    });

    const result = await flow.addItem({ userId: 'u1', productId: 'p1', quantity: 1 });

    expect(result).toMatchObject({ ok: false, code: 'insufficient_stock' });
    expect(cartRepo.save).not.toHaveBeenCalled();
  });

  it('checks aggregate availability across separately customized lines', async () => {
    const customizedCart: Cart = {
      ...persistedCart,
      items: [
        { ...persistedCart.items[0], quantity: 2, customImages: ['a'] },
        { ...persistedCart.items[0], quantity: 3, customImages: ['b'] },
      ],
    };
    const { flow, availabilityReader } = buildFlow({ cart: customizedCart });

    await flow.addItem({
      userId: 'u1',
      productId: 'p1',
      quantity: 1,
      customImages: ['c'],
    });

    expect(availabilityReader.assertAvailable).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'p1' }),
      6,
      undefined,
    );
  });

  it('removes an item through the same persistence path', async () => {
    const { flow, cartRepo } = buildFlow();

    const result = await flow.removeItem({ userId: 'u1', productId: 'p1' });

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.items).toHaveLength(0);
    expect(cartRepo.save).toHaveBeenCalled();
  });

  it('updates only the addressed customized line', async () => {
    const customCart: Cart = {
      ...persistedCart,
      items: [
        { ...persistedCart.items[0], quantity: 1, customImages: ['front-a'] },
        { ...persistedCart.items[0], quantity: 2, customImages: ['front-b'] },
      ],
    };
    const { flow } = buildFlow({ cart: customCart });

    const result = await flow.updateItem({
      userId: 'u1',
      productId: 'p1',
      quantity: 3,
      customImages: ['front-b'],
    });

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.items.map((item) => item.quantity)).toEqual([1, 3]);
  });

  it('removes only the addressed customized line', async () => {
    const customCart: Cart = {
      ...persistedCart,
      items: [
        { ...persistedCart.items[0], customImages: ['front-a'] },
        { ...persistedCart.items[0], customImages: ['front-b'] },
      ],
    };
    const { flow } = buildFlow({ cart: customCart });

    const result = await flow.removeItem({
      userId: 'u1',
      productId: 'p1',
      customImages: ['front-a'],
    });

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.items).toEqual([
      expect.objectContaining({ customImages: ['front-b'] }),
    ]);
  });

  it('treats quantity zero as removal without a product lookup', async () => {
    const { flow, cartRepo, productReadModel } = buildFlow();

    const result = await flow.updateItem({ userId: 'u1', productId: 'p1', quantity: 0 });

    expect(result.ok).toBe(true);
    expect(productReadModel.getProduct).not.toHaveBeenCalled();
    expect(cartRepo.save).toHaveBeenCalled();
  });

  it('clears the repository through the application flow', async () => {
    const { flow, cartRepo } = buildFlow();

    const result = await flow.clearCart({ userId: 'u1' });

    expect(result.ok).toBe(true);
    expect(cartRepo.clear).toHaveBeenCalledWith('u1');
  });

  it('clears expired discount intent and revalidates', async () => {
    const validation = {
      validate: vi
        .fn()
        .mockResolvedValueOnce({
          valid: false,
          issues: [{ code: 'discount_expired', message: 'This discount has expired' }],
          requiresRefresh: true,
        })
        .mockResolvedValueOnce({ valid: true, issues: [], requiresRefresh: false }),
    };
    const { flow, cartRepo } = buildFlow({ validation });

    const result = await flow.validateCart({ userId: 'u1' });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.valid).toBe(true);
      expect(result.data.requiresRefresh).toBe(true);
    }
    expect(cartRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ discountCode: undefined }),
      expect.anything(),
    );
  });
});
