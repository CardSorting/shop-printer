import { DomainError, UnauthorizedError } from '@domain/errors';
import type { RefundErrorCode, RefundResult } from '../refund/refundResult';

export type AdminErrorCode =
  | 'FORBIDDEN'
  | 'ELEVATION_REQUIRED'
  | 'VALIDATION_FAILED'
  | 'NOT_FOUND'
  | 'CHECKOUT_DELEGATION_FAILED'
  | 'INVENTORY_DELEGATION_FAILED'
  | 'OPERATOR_NOT_CONFIGURED'
  | 'DOMAIN_ERROR'
  | 'UNKNOWN';

export type AdminResult<T> =
  | { ok: true; data: T; duplicate?: boolean }
  | {
      ok: false;
      code: AdminErrorCode;
      message: string;
      retryable: boolean;
    };

export function adminOk<T>(data: T, duplicate?: boolean): AdminResult<T> {
  return duplicate ? { ok: true, data, duplicate } : { ok: true, data };
}

export function adminErr(
  code: AdminErrorCode,
  message: string,
  retryable = false,
): AdminResult<never> {
  return { ok: false, code, message, retryable };
}

export function adminFromError(error: unknown): AdminResult<never> {
  if (error instanceof UnauthorizedError) {
    return adminErr('FORBIDDEN', error.message, false);
  }
  if (error instanceof DomainError) {
    return adminErr('DOMAIN_ERROR', error.message, false);
  }
  if (error instanceof Error) {
    const retryable = /timeout|unavailable|retry|rate limit/i.test(error.message);
    return adminErr('UNKNOWN', error.message, retryable);
  }
  return adminErr('UNKNOWN', 'An unexpected admin error occurred', false);
}

export async function adminTry<T>(fn: () => Promise<T>): Promise<AdminResult<T>> {
  try {
    return adminOk(await fn());
  } catch (error) {
    return adminFromError(error);
  }
}

export function adminFromCheckoutResult<T>(
  result: { ok: true; data: T; duplicate?: boolean } | { ok: false; message: string; retryable: boolean },
): AdminResult<T> {
  if (result.ok) {
    return adminOk(result.data, result.duplicate);
  }
  return adminErr(
    'CHECKOUT_DELEGATION_FAILED',
    result.message,
    result.retryable,
  );
}

export function adminFromInventoryResult<T>(
  result: { ok: true; data: T; duplicate?: boolean } | { ok: false; message: string; retryable: boolean },
): AdminResult<T> {
  if (result.ok) {
    return adminOk(result.data, result.duplicate);
  }
  return adminErr(
    'INVENTORY_DELEGATION_FAILED',
    result.message,
    result.retryable,
  );
}

export function adminFromRefundResult<T>(
  result: RefundResult<T>,
): AdminResult<T> {
  if (result.ok) {
    return adminOk(result.data, result.duplicate);
  }
  const codeMap: Partial<Record<RefundErrorCode, AdminErrorCode>> = {
    VALIDATION_FAILED: 'VALIDATION_FAILED',
    DOMAIN_ERROR: 'DOMAIN_ERROR',
    FORBIDDEN: 'FORBIDDEN',
    NOT_FOUND: 'NOT_FOUND',
    ORDER_LOCKED: 'DOMAIN_ERROR',
    NO_PAYMENT: 'VALIDATION_FAILED',
    INSUFFICIENT_BALANCE: 'VALIDATION_FAILED',
    REFUND_IN_PROGRESS: 'DOMAIN_ERROR',
    PAYMENT_PROCESSOR_FAILED: 'DOMAIN_ERROR',
    STATE_SYNC_FAILED: 'DOMAIN_ERROR',
  };
  return adminErr(
    codeMap[result.code] ?? 'DOMAIN_ERROR',
    result.message,
    result.retryable,
  );
}
