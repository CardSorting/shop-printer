import { CheckoutSessionExpiredError, DomainError, PaymentFailedError, UnauthorizedError } from '@domain/errors';

export type CheckoutErrorCode =
  | 'CHECKOUT_NOT_CONFIGURED'
  | 'STRIPE_NOT_CONFIGURED'
  | 'OPERATOR_NOT_CONFIGURED'
  | 'SESSION_CREATE_FAILED'
  | 'CHECKOUT_RESTART_REQUIRED'
  | 'FORBIDDEN'
  | 'PAYMENT_METHOD_FAILED'
  | 'WEBHOOK_INVALID_SIGNATURE'
  | 'WEBHOOK_PROCESSING_FAILED'
  | 'WEBHOOK_IN_PROGRESS'
  | 'RECOVERY_FAILED'
  | 'CLEANUP_NOT_CONFIGURED'
  | 'VERIFICATION_FAILED'
  | 'OPERATOR_ACTION_FAILED'
  | 'DOMAIN_ERROR'
  | 'UNKNOWN';

export type CheckoutResult<T> =
  | { ok: true; data: T; duplicate?: boolean }
  | { ok: false; code: CheckoutErrorCode; message: string; retryable: boolean };

export function checkoutOk<T>(data: T, duplicate?: boolean): CheckoutResult<T> {
  return duplicate ? { ok: true, data, duplicate } : { ok: true, data };
}

export function checkoutErr(
  code: CheckoutErrorCode,
  message: string,
  retryable = false,
): CheckoutResult<never> {
  return { ok: false, code, message, retryable };
}

export function checkoutFromError(error: unknown): CheckoutResult<never> {
  if (error instanceof UnauthorizedError) {
    return checkoutErr('FORBIDDEN', error.message, false);
  }
  if (error instanceof PaymentFailedError) {
    return checkoutErr('SESSION_CREATE_FAILED', error.message, false);
  }
  if (error instanceof CheckoutSessionExpiredError) {
    return checkoutErr('CHECKOUT_RESTART_REQUIRED', error.message, false);
  }
  if (error instanceof DomainError) {
    return checkoutErr('DOMAIN_ERROR', error.message, false);
  }
  if (error instanceof Error) {
    const retryable = /timeout|unavailable|retry|rate limit/i.test(error.message);
    return checkoutErr('UNKNOWN', error.message, retryable);
  }
  return checkoutErr('UNKNOWN', 'An unexpected checkout error occurred', false);
}

export async function checkoutTry<T>(fn: () => Promise<T>): Promise<CheckoutResult<T>> {
  try {
    return checkoutOk(await fn());
  } catch (error) {
    return checkoutFromError(error);
  }
}
