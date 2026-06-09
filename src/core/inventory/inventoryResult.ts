import { DomainError, InsufficientStockError } from '@domain/errors';

export type InventoryErrorCode =
  | 'INSUFFICIENT_STOCK'
  | 'PRODUCT_NOT_FOUND'
  | 'RESERVATION_NOT_FOUND'
  | 'RESERVATION_INVALID_STATE'
  | 'RECONCILIATION_REQUIRED'
  | 'OVERSELL_DETECTED'
  | 'LOCATION_RECEIVE_FAILED'
  | 'INVALID_INPUT'
  | 'DOMAIN_ERROR'
  | 'UNKNOWN';

export type InventoryResult<T> =
  | { ok: true; data: T; duplicate?: boolean }
  | { ok: false; code: InventoryErrorCode; message: string; retryable: boolean };

export function inventoryOk<T>(data: T, duplicate?: boolean): InventoryResult<T> {
  return duplicate ? { ok: true, data, duplicate } : { ok: true, data };
}

export function inventoryErr(
  code: InventoryErrorCode,
  message: string,
  retryable = false,
): InventoryResult<never> {
  return { ok: false, code, message, retryable };
}

export function inventoryFromError(error: unknown): InventoryResult<never> {
  if (error instanceof InsufficientStockError) {
    return inventoryErr('INSUFFICIENT_STOCK', error.message, false);
  }
  if (error instanceof DomainError) {
    return inventoryErr('DOMAIN_ERROR', error.message, false);
  }
  if (error instanceof Error) {
    const retryable = /timeout|unavailable|retry|rate limit/i.test(error.message);
    return inventoryErr('UNKNOWN', error.message, retryable);
  }
  return inventoryErr('UNKNOWN', 'An unexpected inventory error occurred', false);
}

export async function inventoryTry<T>(fn: () => Promise<T>): Promise<InventoryResult<T>> {
  try {
    return inventoryOk(await fn());
  } catch (error) {
    return inventoryFromError(error);
  }
}
