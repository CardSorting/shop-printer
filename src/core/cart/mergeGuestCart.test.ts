import { describe, expect, it, vi } from 'vitest';
import { guestCartItemsFromCart, mergeGuestCartItems } from './mergeGuestCart';

describe('mergeGuestCartItems', () => {
  it('merges all guest items when every add succeeds', async () => {
    const mergeItem = vi.fn().mockResolvedValue({ ok: true });

    const result = await mergeGuestCartItems(
      [
        { productId: 'p1', quantity: 1 },
        { productId: 'p2', quantity: 2, variantId: 'v1' },
      ],
      mergeItem,
    );

    expect(result.mergedCount).toBe(2);
    expect(result.remainingGuestItems).toEqual([]);
    expect(result.issues).toEqual([]);
    expect(mergeItem).toHaveBeenCalledTimes(2);
  });

  it('stops merge and preserves remaining guest items on first failure', async () => {
    const mergeItem = vi
      .fn()
      .mockResolvedValueOnce({ ok: true })
      .mockResolvedValueOnce({ ok: false, message: 'Insufficient stock' });

    const result = await mergeGuestCartItems(
      [
        { productId: 'p1', quantity: 1 },
        { productId: 'p2', quantity: 2 },
        { productId: 'p3', quantity: 1 },
      ],
      mergeItem,
    );

    expect(result.mergedCount).toBe(1);
    expect(result.remainingGuestItems).toEqual([
      { productId: 'p2', quantity: 2 },
      { productId: 'p3', quantity: 1 },
    ]);
    expect(result.issues[0]?.message).toBe('Insufficient stock');
    expect(mergeItem).toHaveBeenCalledTimes(2);
  });

  it('preserves customization identity through merge and recovery', async () => {
    const customImages = ['front-a.jpg', '', 'back.jpg'];
    const items = guestCartItemsFromCart({
      id: 'guest',
      userId: 'guest',
      items: [{
        productId: 'p1',
        quantity: 1,
        name: 'Custom deck',
        priceSnapshot: 2_500,
        imageUrl: '/deck.jpg',
        customImages,
      }],
      updatedAt: new Date(),
    });
    const mergeItem = vi.fn().mockResolvedValue({ ok: false, message: 'Try again' });

    const result = await mergeGuestCartItems(items, mergeItem);

    expect(mergeItem).toHaveBeenCalledWith(expect.objectContaining({ customImages }));
    expect(result.remainingGuestItems[0]?.customImages).toEqual(customImages);
  });
});
