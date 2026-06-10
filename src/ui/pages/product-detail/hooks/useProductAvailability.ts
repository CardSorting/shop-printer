'use client';

import { useMemo } from 'react';
import type { Product, ProductVariant } from '@domain/models';
import { MAX_CART_QUANTITY } from '@domain/rules';

function canContinueSelling(product: Product, variant: ProductVariant | null): boolean {
  if (product.isDigital) return true;
  if (product.continueSellingWhenOutOfStock) return true;
  if (product.inventoryPolicy === 'continue') return true;
  if (variant?.inventoryPolicy === 'continue') return true;
  return false;
}

export function useProductAvailability(product: Product | null, selectedVariant: ProductVariant | null) {
  const currentPrice = selectedVariant ? selectedVariant.price : (product?.price ?? 0);
  const currentCompareAtPrice =
    (selectedVariant ? selectedVariant.compareAtPrice : product?.compareAtPrice) ?? null;
  const currentStock = selectedVariant ? selectedVariant.stock : (product?.stock ?? 0);
  const currentSku = selectedVariant ? selectedVariant.sku : product?.sku;

  const purchaseDisabled = useMemo(() => {
    if (!product) return true;
    if (product.status === 'archived' || product.status === 'draft') return true;
    if (canContinueSelling(product, selectedVariant)) return false;
    return currentStock <= 0;
  }, [product, selectedVariant, currentStock]);

  const unavailableReason = useMemo((): 'archived' | 'out_of_stock' | null => {
    if (!product) return null;
    if (product.status === 'archived') return 'archived';
    if (purchaseDisabled && currentStock <= 0) return 'out_of_stock';
    return null;
  }, [product, purchaseDisabled, currentStock]);

  const maxSelectableQuantity = Math.max(1, Math.min(currentStock, MAX_CART_QUANTITY));

  return {
    currentPrice,
    currentCompareAtPrice,
    currentStock,
    currentSku,
    maxSelectableQuantity,
    purchaseDisabled,
    unavailableReason,
  };
}
