/**
 * Cart purchase intent protocol — public core exports.
 */
export type { CartApplicationService } from './cartApplicationService';
export type { CartResult, CartErrorCode } from './cartResult';
export type {
  CartView,
  CartLineItem,
  CartValidation,
  CartIssue,
  CartIssueCode,
  CartAvailabilityStatus,
  AddCartItemInput,
  UpdateCartItemInput,
  RemoveCartItemInput,
  ApplyDiscountInput,
  ValidateCartInput,
  PreviewLineItemInput,
} from './types';
export { createCartStack } from './createCartStack';
export type { CartStack, CartStackDeps } from './createCartStack';
export { CartUxEventBus } from './cartEvents';
export type { CartUxEvent } from './cartEvents';
export {
  CART_INTENT_TTL_MS,
  CART_DEFAULT_CURRENCY,
  CART_LOW_STOCK_THRESHOLD,
} from './constants';
export { addGuestLineItem, updateGuestLineQuantity, removeGuestLineItem } from './cartMutations';
export { mergeGuestCartItems, guestCartItemsFromCart } from './mergeGuestCart';
export type { GuestCartMergeResult, GuestCartMergeItem } from './mergeGuestCart';
export { buildEmptyCartView, mapCartToView, isCartExpired } from './cartViewMapper';
