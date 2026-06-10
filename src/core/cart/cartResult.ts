export type CartErrorCode =
  | 'product_not_found'
  | 'insufficient_stock'
  | 'cart_empty'
  | 'cart_expired'
  | 'cart_invalid'
  | 'discount_invalid'
  | 'unauthorized'
  | 'internal';

export type CartResult<T> =
  | { ok: true; data: T }
  | { ok: false; code: CartErrorCode; message: string; retryable: boolean };

export function cartOk<T>(data: T): CartResult<T> {
  return { ok: true, data };
}

export function cartErr<T>(
  code: CartErrorCode,
  message: string,
  retryable = false,
): CartResult<T> {
  return { ok: false, code, message, retryable };
}
