import type { Cart } from '@domain/models';

export const GUEST_CART_KEY = 'WoodBine_guest_cart';
export const LEGACY_GUEST_CART_KEY = 'woodbine_guest_cart';

export function loadGuestCart(): Cart | null {
  if (typeof window === 'undefined') return null;
  const saved = localStorage.getItem(GUEST_CART_KEY) ?? localStorage.getItem(LEGACY_GUEST_CART_KEY);
  if (!saved) return null;
  try {
    const parsed = JSON.parse(saved) as Cart;
    return { ...parsed, updatedAt: new Date(parsed.updatedAt) };
  } catch {
    return null;
  }
}

export function saveGuestCart(cart: Cart | null): void {
  if (typeof window === 'undefined') return;
  if (cart) {
    localStorage.setItem(GUEST_CART_KEY, JSON.stringify(cart));
    localStorage.removeItem(LEGACY_GUEST_CART_KEY);
  } else {
    localStorage.removeItem(GUEST_CART_KEY);
    localStorage.removeItem(LEGACY_GUEST_CART_KEY);
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
