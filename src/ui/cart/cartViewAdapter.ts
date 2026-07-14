import type { CartView } from '@core/cart';
import type { Cart } from '@domain/models';

export function cartViewToDomain(view: CartView): Cart {
  return {
    id: view.id,
    userId: view.userId,
    note: view.note,
    discountCode: view.discountCode,
    updatedAt: view.updatedAt,
    items: view.items.map((line) => ({
      productId: line.productId,
      variantId: line.variantId,
      variantTitle: line.variantTitle,
      productHandle: line.productHandle,
      name: line.title,
      priceSnapshot: line.priceSnapshot,
      quantity: line.quantity,
      imageUrl: line.image,
      isDigital: line.isDigital,
      shippingClassId: line.shippingClassId,
      weightGrams: line.weightGrams,
      customImages: line.customImages,
    })),
  };
}
