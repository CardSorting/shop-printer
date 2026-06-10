import type { CartValidation, CartView } from '@core/cart';

export type CartViewState =
  | { state: 'loading' }
  | { state: 'empty' }
  | { state: 'ready'; cart: CartView }
  | { state: 'expired' }
  | { state: 'invalid'; issues: CartValidation['issues'] };
