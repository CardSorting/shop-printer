import { DomainError, UnauthorizedError } from '@domain/errors';

export type CrmErrorCode =
  | 'FORBIDDEN'
  | 'VALIDATION_FAILED'
  | 'NOT_FOUND'
  | 'DOMAIN_ERROR'
  | 'UNKNOWN';

export type CrmResult<T> =
  | { ok: true; data: T; duplicate?: boolean }
  | { ok: false; code: CrmErrorCode; message: string; retryable: boolean };

export function crmOk<T>(data: T, duplicate?: boolean): CrmResult<T> {
  return duplicate ? { ok: true, data, duplicate } : { ok: true, data };
}

export function crmErr(
  code: CrmErrorCode,
  message: string,
  retryable = false,
): CrmResult<never> {
  return { ok: false, code, message, retryable };
}

export function crmFromError(error: unknown): CrmResult<never> {
  if (error instanceof UnauthorizedError) {
    return crmErr('FORBIDDEN', error.message, false);
  }
  if (error instanceof DomainError) {
    return crmErr('DOMAIN_ERROR', error.message, false);
  }
  if (error instanceof Error) {
    const retryable = /timeout|unavailable|retry|rate limit/i.test(error.message);
    return crmErr('UNKNOWN', error.message, retryable);
  }
  return crmErr('UNKNOWN', 'An unexpected CRM error occurred', false);
}

export async function crmTry<T>(fn: () => Promise<T>): Promise<CrmResult<T>> {
  try {
    return crmOk(await fn());
  } catch (error) {
    return crmFromError(error);
  }
}
