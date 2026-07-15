import { beforeEach, describe, expect, it } from 'vitest';
import type { Cart } from '@domain/models';
import {
  GUEST_CART_KEY,
  GUEST_CART_STORAGE_VERSION,
  loadGuestCart,
  saveGuestCart,
} from './guestCartStorage';

const cart: Cart = {
  id: 'guest',
  userId: 'guest',
  items: [{
    productId: 'p1',
    name: 'Product',
    priceSnapshot: 1_500,
    quantity: 2,
    imageUrl: '/product.jpg',
  }],
  updatedAt: new Date('2026-07-14T12:00:00.000Z'),
};

describe('guest cart storage protocol', () => {
  beforeEach(() => window.localStorage.clear());

  it('round-trips only the versioned cart envelope', () => {
    saveGuestCart(cart);

    expect(JSON.parse(window.localStorage.getItem(GUEST_CART_KEY) ?? '{}')).toMatchObject({
      version: GUEST_CART_STORAGE_VERSION,
      cart: { userId: 'guest', items: [{ productId: 'p1', quantity: 2 }] },
    });
    expect(loadGuestCart()).toEqual(cart);
  });

  it('deletes an unversioned payload instead of executing it', () => {
    window.localStorage.setItem(GUEST_CART_KEY, JSON.stringify(cart));

    expect(loadGuestCart()).toBeNull();
    expect(window.localStorage.getItem(GUEST_CART_KEY)).toBeNull();
  });

  it('deletes malformed quantities instead of hydrating invalid state', () => {
    window.localStorage.setItem(GUEST_CART_KEY, JSON.stringify({
      version: GUEST_CART_STORAGE_VERSION,
      cart: {
        ...cart,
        items: [{ ...cart.items[0], quantity: 100 }],
        updatedAt: cart.updatedAt.toISOString(),
      },
    }));

    expect(loadGuestCart()).toBeNull();
    expect(window.localStorage.getItem(GUEST_CART_KEY)).toBeNull();
  });

  it('ignores retired storage keys', () => {
    window.localStorage.setItem('WoodBine_guest_cart', JSON.stringify(cart));
    window.localStorage.setItem('woodbine_guest_cart', JSON.stringify(cart));

    expect(loadGuestCart()).toBeNull();
  });
});
