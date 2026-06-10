import { DomainError, OrderNotFoundError, PaymentFailedError, UnauthorizedError } from '@domain/errors';

export type RefundErrorCode =
  | 'FORBIDDEN'
  | 'VALIDATION_FAILED'
  | 'NOT_FOUND'
  | 'ORDER_LOCKED'
  | 'NO_PAYMENT'
  | 'INSUFFICIENT_BALANCE'
  | 'REFUND_IN_PROGRESS'
  | 'PAYMENT_PROCESSOR_FAILED'
  | 'STATE_SYNC_FAILED'
  | 'DOMAIN_ERROR'
  | 'UNKNOWN';

export type RefundResult<T> =
  | { ok: true; data: T; duplicate?: boolean }
  | { ok: false; code: RefundErrorCode; message: string; retryable: boolean };

export function refundOk<T>(data: T, duplicate?: boolean): RefundResult<T> {
  return duplicate ? { ok: true, data, duplicate } : { ok: true, data };
}

export function refundErr(
  code: RefundErrorCode,
  message: string,
  retryable = false,
): RefundResult<never> {
  return { ok: false, code, message, retryable };
}

export function refundFromError(error: unknown): RefundResult<never> {
  if (error instanceof UnauthorizedError) {
    return refundErr('FORBIDDEN', error.message, false);
  }
  if (error instanceof OrderNotFoundError) {
    return refundErr('NOT_FOUND', error.message, false);
  }
  if (error instanceof PaymentFailedError) {
    return refundErr('PAYMENT_PROCESSOR_FAILED', error.message, false);
  }
  if (error instanceof DomainError) {
    return refundErr('DOMAIN_ERROR', error.message, false);
  }
  if (error instanceof Error) {
    const message = error.message;
    if (/already in progress/i.test(message)) {
      return refundErr('REFUND_IN_PROGRESS', message, true);
    }
    if (/manual reconciliation/i.test(message)) {
      return refundErr('ORDER_LOCKED', message, false);
    }
    if (/no refundable balance/i.test(message)) {
      return refundErr('INSUFFICIENT_BALANCE', message, false);
    }
    if (/without a payment transaction/i.test(message)) {
      return refundErr('NO_PAYMENT', message, false);
    }
    if (/Stripe refund succeeded but failed to update order state/i.test(message)) {
      return refundErr('STATE_SYNC_FAILED', message, true);
    }
    if (/Payment processor failed/i.test(message)) {
      return refundErr('PAYMENT_PROCESSOR_FAILED', message, false);
    }
    const retryable = /timeout|unavailable|retry|rate limit/i.test(message);
    return refundErr('UNKNOWN', message, retryable);
  }
  return refundErr('UNKNOWN', 'An unexpected refund error occurred', false);
}

export async function refundTry<T>(fn: () => Promise<T>): Promise<RefundResult<T>> {
  try {
    return refundOk(await fn());
  } catch (error) {
    return refundFromError(error);
  }
}
