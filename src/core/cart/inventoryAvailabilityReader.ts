import type { Product } from '@domain/models';
import { InsufficientStockError } from '@domain/errors';
import type { InventoryApplicationService } from '../inventory/inventoryApplicationService';
import { CART_LOW_STOCK_THRESHOLD } from './constants';
import type { CartAvailabilityStatus } from './types';

type AvailabilityReaderDeps = {
  inventory?: Pick<InventoryApplicationService, 'checkAvailability'>;
};

/**
 * Advisory availability reads — never reserves stock.
 */
export class InventoryAvailabilityReader {
  constructor(private deps: AvailabilityReaderDeps) {}

  async resolveStatus(
    product: Product,
    quantity: number,
    variantId?: string,
  ): Promise<CartAvailabilityStatus> {
    if (product.status === 'archived' || product.status === 'draft') {
      return 'unavailable';
    }

    if (product.isDigital || product.continueSellingWhenOutOfStock || product.inventoryPolicy === 'continue') {
      return 'in_stock';
    }

    const variant = variantId ? product.variants?.find((v) => v.id === variantId) : undefined;
    if (variant?.inventoryPolicy === 'continue') {
      return 'in_stock';
    }

    const stock = variant ? variant.stock : product.stock;

    if (this.deps.inventory) {
      const result = await this.deps.inventory.checkAvailability({
        items: [{ productId: product.id, variantId, quantity }],
      });
      if (!result.ok) return 'unavailable';
      if (!result.data.available) {
        const line = result.data.lines.find(
          (entry) => entry.productId === product.id && entry.variantId === variantId,
        ) ?? result.data.lines[0];
        if ((line?.available ?? 0) <= 0) return 'out_of_stock';
        if ((line?.available ?? 0) < quantity) return 'out_of_stock';
      }
    }

    if (stock <= 0) return 'out_of_stock';
    if (stock <= CART_LOW_STOCK_THRESHOLD) return 'low_stock';
    return 'in_stock';
  }

  async assertAvailable(product: Product, quantity: number, variantId?: string): Promise<void> {
    if (product.isDigital || product.continueSellingWhenOutOfStock) return;

    if (!this.deps.inventory) {
      const variant = variantId ? product.variants?.find((entry) => entry.id === variantId) : undefined;
      const available = variant ? variant.stock : product.stock;
      if (available < quantity) {
        throw new InsufficientStockError(variantId || product.id, quantity, available);
      }
      return;
    }

    const result = await this.deps.inventory.checkAvailability({
      items: [{ productId: product.id, variantId, quantity }],
    });
    if (!result.ok) throw new Error(result.message);
    const line = result.data.lines.find(
      (entry) => entry.productId === product.id && entry.variantId === variantId,
    ) ?? result.data.lines[0];

    if (!result.data.available) {
      throw new InsufficientStockError(variantId || product.id, quantity, line?.available ?? 0);
    }
  }
}
