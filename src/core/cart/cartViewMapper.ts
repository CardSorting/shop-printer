import { calculateCartTotal } from '@domain/rules';
import type { Cart, CartItem } from '@domain/models';
import { CART_DEFAULT_CURRENCY, CART_INTENT_TTL_MS } from './constants';
import type { CartAvailabilityStatus, CartLineItem, CartView } from './types';
import type { InventoryAvailabilityReader } from './inventoryAvailabilityReader';
import type { ProductReadModel } from './productReadModel';

function domainItemToLineItem(
  item: CartItem,
  availabilityStatus: CartAvailabilityStatus = 'in_stock',
): CartLineItem {
  return {
    productId: item.productId,
    variantId: item.variantId,
    title: item.name,
    image: item.imageUrl,
    priceSnapshot: item.priceSnapshot,
    currency: CART_DEFAULT_CURRENCY,
    quantity: item.quantity,
    availabilityStatus,
    variantTitle: item.variantTitle,
    productHandle: item.productHandle,
    isDigital: item.isDigital,
    shippingClassId: item.shippingClassId,
    weightGrams: item.weightGrams,
  };
}

export function buildEmptyCartView(userId: string): CartView {
  const now = new Date();
  return {
    id: userId,
    userId,
    items: [],
    subtotal: 0,
    totalItems: 0,
    updatedAt: now,
    expiresAt: new Date(now.getTime() + CART_INTENT_TTL_MS),
  };
}

export function mapCartToView(cart: Cart, items?: CartLineItem[]): CartView {
  const lineItems = items ?? cart.items.map((item) => domainItemToLineItem(item));
  const subtotal = calculateCartTotal(
    lineItems.map((item) => ({ priceSnapshot: item.priceSnapshot, quantity: item.quantity })),
  );
  const totalItems = lineItems.reduce((sum, item) => sum + item.quantity, 0);
  const updatedAt = cart.updatedAt instanceof Date ? cart.updatedAt : new Date(cart.updatedAt);

  return {
    id: cart.id,
    userId: cart.userId,
    items: lineItems,
    note: cart.note,
    discountCode: cart.discountCode,
    subtotal,
    totalItems,
    updatedAt,
    expiresAt: new Date(updatedAt.getTime() + CART_INTENT_TTL_MS),
  };
}

export async function enrichCartLineItems(
  cart: Cart,
  productReadModel: ProductReadModel,
  availabilityReader: InventoryAvailabilityReader,
): Promise<CartLineItem[]> {
  const enriched: CartLineItem[] = [];

  for (const item of cart.items) {
    const product = await productReadModel.getProduct(item.productId);
    if (!product) {
      enriched.push(domainItemToLineItem(item, 'unavailable'));
      continue;
    }

    const availabilityStatus = await availabilityReader.resolveStatus(
      product,
      item.quantity,
      item.variantId,
    );
    enriched.push(domainItemToLineItem(item, availabilityStatus));
  }

  return enriched;
}

export function isCartExpired(cart: Cart): boolean {
  const updatedAt = cart.updatedAt instanceof Date ? cart.updatedAt : new Date(cart.updatedAt);
  return Date.now() - updatedAt.getTime() > CART_INTENT_TTL_MS;
}
