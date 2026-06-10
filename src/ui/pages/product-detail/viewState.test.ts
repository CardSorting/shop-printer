import { describe, expect, it } from 'vitest';
import type { Product } from '@domain/models';
import { deriveProductDetailViewState } from './viewState';

const baseProduct = {
  id: '1',
  name: 'Test',
  description: '',
  price: 1000,
  category: 'Art',
  stock: 5,
  imageUrl: '/a.jpg',
  media: [],
  status: 'active',
  createdAt: new Date(),
  updatedAt: new Date(),
} as Product;

describe('deriveProductDetailViewState', () => {
  it('returns loading when product is absent', () => {
    expect(
      deriveProductDetailViewState({
        loading: true,
        error: null,
        product: null,
        purchaseDisabled: true,
        unavailableReason: null,
      }),
    ).toEqual({ state: 'loading' });
  });

  it('returns not_found on error without product', () => {
    expect(
      deriveProductDetailViewState({
        loading: false,
        error: 'missing',
        product: null,
        purchaseDisabled: true,
        unavailableReason: null,
      }),
    ).toEqual({ state: 'not_found' });
  });

  it('returns unavailable archived for archived products', () => {
    expect(
      deriveProductDetailViewState({
        loading: false,
        error: null,
        product: { ...baseProduct, status: 'archived' },
        purchaseDisabled: true,
        unavailableReason: 'archived',
      }),
    ).toEqual({ state: 'unavailable', reason: 'archived' });
  });

  it('returns unavailable out_of_stock when purchase is disabled', () => {
    expect(
      deriveProductDetailViewState({
        loading: false,
        error: null,
        product: { ...baseProduct, stock: 0 },
        purchaseDisabled: true,
        unavailableReason: 'out_of_stock',
      }),
    ).toEqual({ state: 'unavailable', reason: 'out_of_stock' });
  });

  it('returns ready for purchasable products', () => {
    expect(
      deriveProductDetailViewState({
        loading: false,
        error: null,
        product: baseProduct,
        purchaseDisabled: false,
        unavailableReason: null,
      }),
    ).toEqual({ state: 'ready' });
  });
});
