import { beforeEach, describe, expect, it, vi } from 'vitest';

const getCart = vi.fn();
const getProductById = vi.fn();
const validateDiscount = vi.fn();
const mockAssertRateLimit = vi.fn();

vi.mock('@infrastructure/server/services', () => ({
  getServerServices: vi.fn(async () => ({
    cart: { getCart },
    productRepo: { getById: getProductById },
    discountService: { validateDiscount },
  })),
}));

vi.mock('@infrastructure/server/apiGuards', () => ({
  assertRateLimit: mockAssertRateLimit,
  requireSessionUser: vi.fn(async () => ({ id: 'user-1', email: 'u@example.com', displayName: 'User' })),
  requireString: (value: unknown, field: string) => {
    if (typeof value !== 'string' || !value.trim()) throw new Error(`${field} is required`);
    return value.trim();
  },
  readJsonObject: async (request: Request) => request.json(),
  jsonError: (err: any, fallback: string) => {
    const status = err?.name === 'DomainError' ? 400 : 500;
    return Response.json({ error: err?.message || fallback }, { status });
  },
}));

describe('discount validation route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAssertRateLimit.mockResolvedValue(undefined);
  });

  it('validates against the authenticated server cart instead of the client subtotal', async () => {
    getCart.mockResolvedValue({
      ok: true,
      data: {
        id: 'cart-1',
        userId: 'user-1',
        items: [
          {
            productId: 'p1',
            title: 'Card',
            image: '',
            priceSnapshot: 1500,
            currency: 'USD',
            quantity: 2,
            availabilityStatus: 'in_stock',
          },
        ],
        subtotal: 3000,
        totalItems: 2,
        updatedAt: new Date(),
        expiresAt: new Date(),
      },
    });
    getProductById.mockResolvedValue({ id: 'p1', collections: ['rare-cards'] });
    validateDiscount.mockResolvedValue({ valid: true, discountAmount: 300 });
    const { POST } = await import('./route');

    const response = await POST(new Request('https://example.test/api/discounts/validate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ code: 'SAVE10', cartTotal: 1 }),
    }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.discountAmount).toBe(300);
    expect(mockAssertRateLimit).toHaveBeenCalledWith(expect.any(Request), 'discount:validate', 30, 60_000, 'user-1');
    expect(getCart).toHaveBeenCalledWith({ userId: 'user-1' });
    expect(validateDiscount).toHaveBeenCalledWith('SAVE10', 3000, 'user-1', undefined, [], {
      lineItems: [{ productId: 'p1', quantity: 2, unitPrice: 1500, subtotal: 3000, collections: ['rare-cards'] }],
    });
  });

  it('fails before validation when the persisted cart is empty', async () => {
    getCart.mockResolvedValue({
      ok: true,
      data: {
        id: 'cart-1',
        userId: 'user-1',
        items: [],
        subtotal: 0,
        totalItems: 0,
        updatedAt: new Date(),
        expiresAt: new Date(),
      },
    });
    const { POST } = await import('./route');

    const response = await POST(new Request('https://example.test/api/discounts/validate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ code: 'SAVE10', cartTotal: 3000 }),
    }));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe('Your cart is empty.');
    expect(validateDiscount).not.toHaveBeenCalled();
  });
});
