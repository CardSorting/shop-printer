import type { Cart, CartItem } from '@domain/models';
import { cartLineMatches, MAX_CART_QUANTITY } from '@domain/rules';
import type { CartLineItem } from './types';

/** Pure guest-cart mutations — snapshots only, no inventory writes. */
export function addGuestLineItem(cart: Cart, line: CartLineItem): Cart {
  const existingIndex = cart.items.findIndex((item) =>
    cartLineMatches(item, line.productId, line.variantId, line.customImages),
  );
  const domainItem: CartItem = {
    productId: line.productId,
    variantId: line.variantId,
    variantTitle: line.variantTitle,
    productHandle: line.productHandle,
    name: line.title,
    priceSnapshot: line.priceSnapshot,
    quantity: Math.min(line.quantity, MAX_CART_QUANTITY),
    imageUrl: line.image,
    isDigital: line.isDigital,
    shippingClassId: line.shippingClassId,
    weightGrams: line.weightGrams,
    customImages: line.customImages,
  };

  const items = [...cart.items];
  if (existingIndex >= 0) {
    items[existingIndex] = {
      ...items[existingIndex],
      quantity: Math.min(items[existingIndex].quantity + line.quantity, MAX_CART_QUANTITY),
    };
  } else {
    items.push(domainItem);
  }

  return { ...cart, items, updatedAt: new Date() };
}

export function updateGuestLineQuantity(
  cart: Cart,
  productId: string,
  quantity: number,
  variantId?: string,
  customImages?: string[],
): Cart {
  const safeQuantity = Math.max(1, Math.min(quantity, MAX_CART_QUANTITY));
  return {
    ...cart,
    items: cart.items.map((item) =>
      cartLineMatches(item, productId, variantId, customImages)
        ? { ...item, quantity: safeQuantity }
        : item,
    ),
    updatedAt: new Date(),
  };
}

export function removeGuestLineItem(
  cart: Cart,
  productId: string,
  variantId?: string,
  customImages?: string[],
): Cart {
  return {
    ...cart,
    items: cart.items.filter(
      (item) => !cartLineMatches(item, productId, variantId, customImages),
    ),
    updatedAt: new Date(),
  };
}
