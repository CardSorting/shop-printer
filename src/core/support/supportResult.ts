import { DomainError, UnauthorizedError } from '@domain/errors';

export type SupportErrorCode =
  | 'FORBIDDEN'
  | 'VALIDATION_FAILED'
  | 'NOT_FOUND'
  | 'INVALID_TRANSITION'
  | 'DOMAIN_ERROR'
  | 'UNKNOWN';

export type SupportResult<T> =
  | { ok: true; data: T; duplicate?: boolean }
  | { ok: false; code: SupportErrorCode; message: string; retryable: boolean };

export function supportOk<T>(data: T, duplicate?: boolean): SupportResult<T> {
  return duplicate ? { ok: true, data, duplicate } : { ok: true, data };
}

export function supportErr(
  code: SupportErrorCode,
  message: string,
  retryable = false,
): SupportResult<never> {
  return { ok: false, code, message, retryable };
}

export function supportFromError(error: unknown): SupportResult<never> {
  if (error instanceof UnauthorizedError) {
    return supportErr('FORBIDDEN', error.message, false);
  }
  if (error instanceof DomainError) {
    return supportErr('DOMAIN_ERROR', error.message, false);
  }
  if (error instanceof Error) {
    const retryable = /timeout|unavailable|retry|rate limit/i.test(error.message);
    return supportErr('UNKNOWN', error.message, retryable);
  }
  return supportErr('UNKNOWN', 'An unexpected support error occurred', false);
}

export async function supportTry<T>(fn: () => Promise<T>): Promise<SupportResult<T>> {
  try {
    return supportOk(await fn());
  } catch (error) {
    return supportFromError(error);
  }
}
