import { calculateCartTotal, MAX_CART_QUANTITY } from '@domain/rules';
import type { Cart } from '@domain/models';
import type { DiscountService } from '../DiscountService';
import { isCartExpired } from './cartViewMapper';
import type { InventoryAvailabilityReader } from './inventoryAvailabilityReader';
import type { PricingSnapshotService } from './pricingSnapshotService';
import type { ProductReadModel } from './productReadModel';
import type { CartIssue, CartValidation } from './types';

type CartValidationDeps = {
  productReadModel: ProductReadModel;
  availabilityReader: InventoryAvailabilityReader;
  pricingSnapshot: PricingSnapshotService;
  discountService?: Pick<DiscountService, 'validateDiscount'>;
};

export class CartValidationService {
  constructor(private deps: CartValidationDeps) {}

  async validate(cart: Cart | null, userId: string): Promise<CartValidation> {
    const issues: CartIssue[] = [];

    if (!cart || cart.items.length === 0) {
      return { valid: false, issues: [{ code: 'quantity_invalid', message: 'Cart is empty.' }], requiresRefresh: false };
    }

    if (isCartExpired(cart)) {
      issues.push({ code: 'cart_expired', message: 'Your cart has expired. Please review items before checkout.' });
    }

    let requiresRefresh = false;

    for (const item of cart.items) {
      if (!Number.isInteger(item.quantity) || item.quantity <= 0 || item.quantity > MAX_CART_QUANTITY) {
        issues.push({
          code: 'quantity_invalid',
          productId: item.productId,
          variantId: item.variantId,
          message: `Invalid quantity for ${item.name}.`,
        });
        continue;
      }

      const product = await this.deps.productReadModel.getProduct(item.productId);
      if (!product) {
        issues.push({
          code: 'product_not_found',
          productId: item.productId,
          variantId: item.variantId,
          message: `${item.name} is no longer available.`,
        });
        continue;
      }

      if (product.status === 'archived' || product.status === 'draft') {
        issues.push({
          code: 'product_unavailable',
          productId: item.productId,
          variantId: item.variantId,
          message: `${item.name} is unavailable.`,
        });
        continue;
      }

      if (item.variantId) {
        const variant = product.variants?.find((v) => v.id === item.variantId);
        if (!variant) {
          issues.push({
            code: 'variant_not_found',
            productId: item.productId,
            variantId: item.variantId,
            message: `Selected variant for ${item.name} is no longer available.`,
          });
          continue;
        }
      }

      const currentPrice = this.deps.pricingSnapshot.resolveCurrentPrice(product, item.variantId);
      if (currentPrice !== item.priceSnapshot) {
        issues.push({
          code: 'pricing_changed',
          productId: item.productId,
          variantId: item.variantId,
          message: `Price changed for ${item.name}. Refresh your cart before checkout.`,
        });
        requiresRefresh = true;
      }

      const availability = await this.deps.availabilityReader.resolveStatus(
        product,
        item.quantity,
        item.variantId,
      );
      if (availability === 'out_of_stock' || availability === 'unavailable') {
        issues.push({
          code: availability === 'unavailable' ? 'product_unavailable' : 'out_of_stock',
          productId: item.productId,
          variantId: item.variantId,
          message: `${item.name} is out of stock.`,
        });
      }
    }

    if (cart.discountCode && this.deps.discountService) {
      const subtotal = calculateCartTotal(cart.items);
      const validation = await this.deps.discountService.validateDiscount(
        cart.discountCode,
        subtotal,
        userId,
        undefined,
        [],
        {
          lineItems: cart.items.map((item) => ({
            ...item,
            unitPrice: item.priceSnapshot,
          })),
        },
      );
      if (!validation.valid) {
        const isExpired = validation.message?.toLowerCase().includes('expired');
        issues.push({
          code: isExpired ? 'discount_expired' : 'discount_invalid',
          message: validation.message || 'Discount is no longer valid.',
        });
        requiresRefresh = true;
      }
    }

    return {
      valid: issues.length === 0,
      issues,
      requiresRefresh,
    };
  }
}
