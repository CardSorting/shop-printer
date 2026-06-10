import { NextResponse } from 'next/server';
import type { SupportErrorCode, SupportResult } from '@core/support/supportResult';

const SUPPORT_HTTP_STATUS: Partial<Record<SupportErrorCode, number>> = {
  VALIDATION_FAILED: 400,
  INVALID_TRANSITION: 400,
  DOMAIN_ERROR: 400,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  UNKNOWN: 500,
};

export function supportHttpStatus(code: SupportErrorCode, retryable: boolean): number {
  if (retryable) return 503;
  return SUPPORT_HTTP_STATUS[code] ?? 500;
}

export function supportSuccessResponse<T>(result: Extract<SupportResult<T>, { ok: true }>) {
  return NextResponse.json({ ...result.data, duplicate: result.duplicate ?? false });
}

export function supportErrorResponse(result: Extract<SupportResult<unknown>, { ok: false }>) {
  return NextResponse.json(
    {
      error: result.message,
      code: result.code,
      retryable: result.retryable,
    },
    { status: supportHttpStatus(result.code, result.retryable) },
  );
}

export function supportRouteResponse<T>(result: SupportResult<T>) {
  return result.ok ? supportSuccessResponse(result) : supportErrorResponse(result);
}
