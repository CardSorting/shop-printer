import type { Product } from '@domain/models';
import { CART_DEFAULT_CURRENCY } from './constants';
import type { CartAvailabilityStatus, CartLineItem } from './types';

export type LineSnapshotInput = {
  product: Product;
  quantity: number;
  variantId?: string;
  availabilityStatus: CartAvailabilityStatus;
};

/**
 * Builds immutable line snapshots at intent time — advisory pricing only.
 */
export class PricingSnapshotService {
  buildLineSnapshot(input: LineSnapshotInput): CartLineItem {
    const { product, quantity, variantId, availabilityStatus } = input;

    let price = product.price;
    let variantTitle: string | undefined;
    let image = product.imageUrl;
    let weightGrams = product.weightGrams;

    if (variantId && product.variants) {
      const variant = product.variants.find((v) => v.id === variantId);
      if (variant) {
        price = variant.price;
        variantTitle = variant.title;
        if (variant.imageUrl) image = variant.imageUrl;
        if (variant.weightGrams !== undefined) weightGrams = variant.weightGrams;
      }
    }

    return {
      productId: product.id,
      variantId,
      title: product.name,
      image,
      priceSnapshot: price,
      currency: CART_DEFAULT_CURRENCY,
      quantity,
      availabilityStatus,
      variantTitle,
      productHandle: product.handle,
      isDigital: product.isDigital,
      shippingClassId: product.shippingClassId,
      weightGrams,
    };
  }

  resolveCurrentPrice(product: Product, variantId?: string): number {
    if (variantId && product.variants) {
      const variant = product.variants.find((v) => v.id === variantId);
      if (variant) return variant.price;
    }
    return product.price;
  }
}
