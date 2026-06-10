import { NextResponse } from 'next/server';
import type { AdminErrorCode, AdminResult } from '@core/admin/adminResult';

const ADMIN_HTTP_STATUS: Partial<Record<AdminErrorCode, number>> = {
  VALIDATION_FAILED: 400,
  DOMAIN_ERROR: 400,
  CHECKOUT_DELEGATION_FAILED: 400,
  INVENTORY_DELEGATION_FAILED: 400,
  FORBIDDEN: 403,
  ELEVATION_REQUIRED: 403,
  NOT_FOUND: 404,
  OPERATOR_NOT_CONFIGURED: 503,
  UNKNOWN: 500,
};

export function adminHttpStatus(code: AdminErrorCode, retryable: boolean): number {
  if (retryable) return 503;
  return ADMIN_HTTP_STATUS[code] ?? 500;
}

export function adminSuccessResponse<T>(result: Extract<AdminResult<T>, { ok: true }>) {
  return NextResponse.json({ ...result.data, duplicate: result.duplicate ?? false });
}

export function adminErrorResponse(result: Extract<AdminResult<unknown>, { ok: false }>) {
  return NextResponse.json(
    {
      error: result.message,
      code: result.code,
      retryable: result.retryable,
    },
    { status: adminHttpStatus(result.code, result.retryable) },
  );
}

export function adminRouteResponse<T>(result: AdminResult<T>) {
  return result.ok ? adminSuccessResponse(result) : adminErrorResponse(result);
}
