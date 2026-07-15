import type { CartResult } from './cartResult';
import type {
  AddCartItemInput,
  ApplyDiscountInput,
  CartValidation,
  CartView,
  ClearCartInput,
  GetCartInput,
  PreviewLineItemInput,
  RemoveCartItemInput,
  UpdateCartItemInput,
  UpdateCartNoteInput,
  ValidateCartInput,
  CartLineItem,
} from './types';

/**
 * Purchase intent buffer — not inventory truth, pricing authority, or checkout authority.
 */
export interface CartApplicationService {
  getCart(input: GetCartInput): Promise<CartResult<CartView>>;
  addItem(input: AddCartItemInput): Promise<CartResult<CartView>>;
  updateItem(input: UpdateCartItemInput): Promise<CartResult<CartView>>;
  removeItem(input: RemoveCartItemInput): Promise<CartResult<CartView>>;
  applyDiscount(input: ApplyDiscountInput): Promise<CartResult<CartView>>;
  clearDiscount(input: GetCartInput): Promise<CartResult<CartView>>;
  clearCart(input: ClearCartInput): Promise<CartResult<CartView>>;
  validateCart(input: ValidateCartInput): Promise<CartResult<CartValidation>>;
  mergeGuestItems(
    input: ValidateCartInput & {
      items: Array<{ productId: string; quantity: number; variantId?: string; customImages?: string[] }>;
    },
  ): Promise<
    CartResult<{
      cart: CartView;
      mergeIssues: import('./types').CartIssue[];
      remainingGuestItems: Array<{ productId: string; quantity: number; variantId?: string; customImages?: string[] }>;
    }>
  >;
  updateNote(input: UpdateCartNoteInput): Promise<CartResult<CartView>>;
  previewLineItem(input: PreviewLineItemInput): Promise<CartResult<CartLineItem>>;
}
