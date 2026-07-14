import type { Cart, CartItem } from '@domain/models';

export type CartAvailabilityStatus = 'in_stock' | 'low_stock' | 'out_of_stock' | 'unavailable';

export type CartLineItem = {
  productId: string;
  variantId?: string;
  title: string;
  image: string;
  priceSnapshot: number;
  currency: string;
  quantity: number;
  availabilityStatus: CartAvailabilityStatus;
  variantTitle?: string;
  productHandle?: string;
  isDigital?: boolean;
  shippingClassId?: string;
  weightGrams?: number;
  customImages?: string[];
};

export type CartView = {
  id: string;
  userId: string;
  items: CartLineItem[];
  note?: string;
  discountCode?: string;
  subtotal: number;
  totalItems: number;
  updatedAt: Date;
  expiresAt: Date;
};

export type CartIssueCode =
  | 'product_not_found'
  | 'variant_not_found'
  | 'quantity_invalid'
  | 'out_of_stock'
  | 'product_unavailable'
  | 'pricing_changed'
  | 'discount_invalid'
  | 'discount_expired'
  | 'cart_expired';

export type CartIssue = {
  code: CartIssueCode;
  productId?: string;
  variantId?: string;
  message: string;
};

export type CartValidation = {
  valid: boolean;
  issues: CartIssue[];
  requiresRefresh: boolean;
};

export type CartContext = { userId: string };

export type GetCartInput = CartContext;
export type ClearCartInput = CartContext;
export type ValidateCartInput = CartContext;

export type AddCartItemInput = CartContext & {
  productId: string;
  quantity: number;
  variantId?: string;
  customImages?: string[];
};

export type UpdateCartItemInput = CartContext & {
  productId: string;
  quantity: number;
  variantId?: string;
};

export type RemoveCartItemInput = CartContext & {
  productId: string;
  variantId?: string;
};

export type ApplyDiscountInput = CartContext & {
  code: string;
};

export type PreviewLineItemInput = {
  productId: string;
  quantity: number;
  variantId?: string;
};

export type UpdateCartNoteInput = CartContext & {
  note: string;
};

/** @internal persisted cart shape */
export type PersistedCart = Cart;

/** @internal bridge from domain cart item */
export type DomainCartItem = CartItem;
