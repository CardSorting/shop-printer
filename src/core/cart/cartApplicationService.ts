import type { CartFlowService } from './cartFlowService';
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
      items: Array<{ productId: string; quantity: number; variantId?: string }>;
    },
  ): Promise<
    CartResult<{
      cart: CartView;
      mergeIssues: import('./types').CartIssue[];
      remainingGuestItems: Array<{ productId: string; quantity: number; variantId?: string }>;
    }>
  >;
  updateNote(input: UpdateCartNoteInput): Promise<CartResult<CartView>>;
  previewLineItem(input: PreviewLineItemInput): Promise<CartResult<CartLineItem>>;
}

export class CartApplicationServiceImpl implements CartApplicationService {
  constructor(private flow: CartFlowService) {}

  getCart(input: GetCartInput) {
    return this.flow.getCart(input);
  }

  addItem(input: AddCartItemInput) {
    return this.flow.addItem(input);
  }

  updateItem(input: UpdateCartItemInput) {
    return this.flow.updateItem(input);
  }

  removeItem(input: RemoveCartItemInput) {
    return this.flow.removeItem(input);
  }

  applyDiscount(input: ApplyDiscountInput) {
    return this.flow.applyDiscount(input);
  }

  clearDiscount(input: GetCartInput) {
    return this.flow.clearDiscount(input);
  }

  clearCart(input: ClearCartInput) {
    return this.flow.clearCart(input);
  }

  validateCart(input: ValidateCartInput) {
    return this.flow.validateCart(input);
  }

  mergeGuestItems(
    input: ValidateCartInput & {
      items: Array<{ productId: string; quantity: number; variantId?: string }>;
    },
  ) {
    return this.flow.mergeGuestItems(input);
  }

  updateNote(input: UpdateCartNoteInput) {
    return this.flow.updateNote(input);
  }

  previewLineItem(input: PreviewLineItemInput) {
    return this.flow.previewLineItem(input);
  }
}
