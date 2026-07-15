import type { Cart, CartItem } from '@domain/models';
import { MAX_CART_QUANTITY } from '@domain/rules';

export const GUEST_CART_STORAGE_VERSION = 1;
export const GUEST_CART_KEY = 'cart:guest:v1';

type StoredGuestCart = {
  version: typeof GUEST_CART_STORAGE_VERSION;
  cart: Omit<Cart, 'updatedAt'> & { updatedAt: string };
};

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && Boolean(value.trim());
}

function isOptionalString(value: unknown): value is string | undefined {
  return value === undefined || typeof value === 'string';
}

function isCartItem(value: unknown): value is CartItem {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const item = value as Partial<CartItem>;
  return isNonEmptyString(item.productId)
    && isNonEmptyString(item.name)
    && typeof item.priceSnapshot === 'number'
    && Number.isSafeInteger(item.priceSnapshot)
    && item.priceSnapshot >= 0
    && typeof item.quantity === 'number'
    && Number.isInteger(item.quantity)
    && item.quantity > 0
    && item.quantity <= MAX_CART_QUANTITY
    && typeof item.imageUrl === 'string'
    && isOptionalString(item.variantId)
    && isOptionalString(item.variantTitle)
    && isOptionalString(item.productHandle)
    && (item.isDigital === undefined || typeof item.isDigital === 'boolean')
    && isOptionalString(item.shippingClassId)
    && (item.weightGrams === undefined
      || (typeof item.weightGrams === 'number' && Number.isFinite(item.weightGrams) && item.weightGrams >= 0))
    && (item.customImages === undefined
      || (Array.isArray(item.customImages)
        && item.customImages.length <= 100
        && item.customImages.every((image) => typeof image === 'string' && image.length <= 4_096)));
}

function parseStoredGuestCart(value: unknown): Cart | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const stored = value as Partial<StoredGuestCart>;
  if (stored.version !== GUEST_CART_STORAGE_VERSION) return null;
  if (!stored.cart || typeof stored.cart !== 'object' || Array.isArray(stored.cart)) return null;

  const cart = stored.cart as StoredGuestCart['cart'];
  if (cart.id !== 'guest'
    || cart.userId !== 'guest'
    || !Array.isArray(cart.items)
    || !cart.items.every(isCartItem)
    || !isOptionalString(cart.note)
    || (cart.note?.length ?? 0) > 100
    || !isOptionalString(cart.discountCode)
    || typeof cart.updatedAt !== 'string'
    || Number.isNaN(Date.parse(cart.updatedAt))) {
    return null;
  }

  return { ...cart, updatedAt: new Date(cart.updatedAt) };
}

export function loadGuestCart(): Cart | null {
  if (typeof window === 'undefined') return null;
  try {
    const saved = window.localStorage.getItem(GUEST_CART_KEY);
    if (!saved) return null;
    const cart = parseStoredGuestCart(JSON.parse(saved) as unknown);
    if (!cart) window.localStorage.removeItem(GUEST_CART_KEY);
    return cart;
  } catch {
    try {
      window.localStorage.removeItem(GUEST_CART_KEY);
    } catch {
      // The cart remains usable in memory when browser storage is unavailable.
    }
    return null;
  }
}

export function saveGuestCart(cart: Cart | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (!cart) {
      window.localStorage.removeItem(GUEST_CART_KEY);
      return;
    }
    const stored: StoredGuestCart = {
      version: GUEST_CART_STORAGE_VERSION,
      cart: { ...cart, updatedAt: cart.updatedAt.toISOString() },
    };
    window.localStorage.setItem(GUEST_CART_KEY, JSON.stringify(stored));
  } catch {
    // The cart remains usable in memory when browser storage is unavailable.
  }
}

export function createGuestCartShell(): Cart {
  return {
    id: 'guest',
    userId: 'guest',
    items: [],
    updatedAt: new Date(),
  };
}
