import { isCartExpired } from '@core/cart/cartViewMapper';
import type { Cart } from '@domain/models';
import type { CartValidation } from '@core/cart';
import type { CartViewState } from './types';

type DeriveCartViewStateInput = {
  loading: boolean;
  cart: Cart | null;
  validation: CartValidation | null;
};

export function deriveCartViewState({
  loading,
  cart,
  validation,
}: DeriveCartViewStateInput): CartViewState {
  if (loading) return { state: 'loading' };

  if (!cart || cart.items.length === 0) {
    return { state: 'empty' };
  }

  if (isCartExpired(cart)) {
    return { state: 'expired' };
  }

  if (validation && !validation.valid) {
    return { state: 'invalid', issues: validation.issues };
  }

  return {
    state: 'ready',
    cart: {
      id: cart.id,
      userId: cart.userId,
      items: cart.items.map((item) => ({
        productId: item.productId,
        variantId: item.variantId,
        title: item.name,
        image: item.imageUrl,
        priceSnapshot: item.priceSnapshot,
        currency: 'USD',
        quantity: item.quantity,
        availabilityStatus:
          item.quantity > 0 ? ('in_stock' as const) : ('out_of_stock' as const),
        variantTitle: item.variantTitle,
        productHandle: item.productHandle,
        isDigital: item.isDigital,
        shippingClassId: item.shippingClassId,
        weightGrams: item.weightGrams,
      })),
      note: cart.note,
      discountCode: cart.discountCode,
      subtotal: cart.items.reduce((sum, item) => sum + item.priceSnapshot * item.quantity, 0),
      totalItems: cart.items.reduce((sum, item) => sum + item.quantity, 0),
      updatedAt: cart.updatedAt,
      expiresAt: new Date(cart.updatedAt.getTime() + 30 * 24 * 60 * 60 * 1000),
    },
  };
}
