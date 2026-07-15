import { describe, expect, it } from 'vitest';
import type { Cart } from '@domain/models';
import { removeGuestLineItem, updateGuestLineQuantity } from './cartMutations';

const cart: Cart = {
  id: 'guest',
  userId: 'guest',
  items: [
    { productId: 'p1', name: 'Deck A', priceSnapshot: 1_000, quantity: 1, imageUrl: '', customImages: ['a'] },
    { productId: 'p1', name: 'Deck B', priceSnapshot: 1_000, quantity: 2, imageUrl: '', customImages: ['b'] },
  ],
  updatedAt: new Date(),
};

describe('guest cart line identity', () => {
  it('updates only the matching customization', () => {
    const updated = updateGuestLineQuantity(cart, 'p1', 4, undefined, ['b']);
    expect(updated.items.map((item) => item.quantity)).toEqual([1, 4]);
  });

  it('removes only the matching customization', () => {
    const updated = removeGuestLineItem(cart, 'p1', undefined, ['a']);
    expect(updated.items).toEqual([expect.objectContaining({ customImages: ['b'] })]);
  });
});
