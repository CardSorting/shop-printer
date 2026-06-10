import type { Product } from '@domain/models';
import type { ProductDetailViewState } from './types';

type DeriveProductDetailViewStateInput = {
  loading: boolean;
  error: string | null;
  product: Product | null;
  purchaseDisabled: boolean;
  unavailableReason: 'archived' | 'out_of_stock' | null;
};

/**
 * Canonical product detail UI state machine.
 */
export function deriveProductDetailViewState({
  loading,
  error,
  product,
  purchaseDisabled,
  unavailableReason,
}: DeriveProductDetailViewStateInput): ProductDetailViewState {
  if (error && !product) {
    return { state: 'not_found' };
  }

  if (loading || !product) {
    return { state: 'loading' };
  }

  if (unavailableReason === 'archived') {
    return { state: 'unavailable', reason: 'archived' };
  }

  if (purchaseDisabled && unavailableReason === 'out_of_stock') {
    return { state: 'unavailable', reason: 'out_of_stock' };
  }

  return { state: 'ready' };
}
