/** Cart protocol helpers for Playwright mocks — matches CartResult<CartView>. */

export const GUEST_CART_STORAGE_VERSION = 1;
export const GUEST_CART_STORAGE_KEY = 'cart:guest:v1';
export const MOCK_CART_IMAGE_URL = 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=400';

export type MockCartLine = {
  productId: string;
  name: string;
  priceSnapshot: number;
  quantity: number;
  imageUrl?: string;
  variantId?: string;
};

export function buildCartView(
  items: MockCartLine[],
  userId = 'guest',
): Record<string, unknown> {
  const lines = items.map((item) => ({
    productId: item.productId,
    variantId: item.variantId,
    title: item.name,
    image: item.imageUrl ?? MOCK_CART_IMAGE_URL,
    priceSnapshot: item.priceSnapshot,
    currency: 'USD',
    quantity: item.quantity,
    availabilityStatus: 'in_stock',
  }));
  const subtotal = items.reduce((sum, item) => sum + item.priceSnapshot * item.quantity, 0);
  const now = new Date().toISOString();
  return {
    id: userId,
    userId,
    items: lines,
    subtotal,
    totalItems: items.reduce((sum, item) => sum + item.quantity, 0),
    updatedAt: now,
    expiresAt: now,
  };
}

export function cartOk(data: Record<string, unknown>) {
  return { ok: true, data };
}

export function guestCartPayload(items: MockCartLine[]) {
  return {
    version: GUEST_CART_STORAGE_VERSION,
    cart: {
      id: 'guest',
      userId: 'guest',
      items: items.map((item) => ({
        productId: item.productId,
        variantId: item.variantId,
        name: item.name,
        priceSnapshot: item.priceSnapshot,
        quantity: item.quantity,
        imageUrl: item.imageUrl ?? MOCK_CART_IMAGE_URL,
      })),
      updatedAt: new Date().toISOString(),
    },
  };
}
