import type { Cart, CartItem } from '@domain/models';
import type { CartIssue } from './types';

export type GuestCartMergeItem = Pick<
  CartItem,
  'productId' | 'quantity' | 'variantId' | 'customImages'
>;

export type GuestCartMergeResult = {
  mergedCount: number;
  remainingGuestItems: GuestCartMergeItem[];
  issues: CartIssue[];
};

type MergeGuestItemFn = (item: GuestCartMergeItem) => Promise<{ ok: true } | { ok: false; message: string }>;

/**
 * Merges guest cart items into the authenticated cart one at a time.
 * Stops on first failure and preserves unmerged guest items.
 */
export async function mergeGuestCartItems(
  guestItems: GuestCartMergeItem[],
  mergeItem: MergeGuestItemFn,
): Promise<GuestCartMergeResult> {
  const issues: CartIssue[] = [];
  let mergedCount = 0;

  for (let index = 0; index < guestItems.length; index += 1) {
    const item = guestItems[index];
    const result = await mergeItem(item);
    if (!result.ok) {
      issues.push({
        code: 'out_of_stock',
        productId: item.productId,
        variantId: item.variantId,
        message: result.message,
      });
      return {
        mergedCount,
        remainingGuestItems: guestItems.slice(index),
        issues,
      };
    }
    mergedCount += 1;
  }

  return { mergedCount, remainingGuestItems: [], issues };
}

export function guestCartItemsFromCart(cart: Cart): GuestCartMergeItem[] {
  return cart.items.map((item) => ({
    productId: item.productId,
    quantity: item.quantity,
    variantId: item.variantId,
    customImages: item.customImages,
  }));
}
