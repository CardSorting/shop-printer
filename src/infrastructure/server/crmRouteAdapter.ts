import { NextResponse } from 'next/server';
import type { CrmErrorCode, CrmResult } from '@core/crm/crmResult';

const CRM_HTTP_STATUS: Partial<Record<CrmErrorCode, number>> = {
  VALIDATION_FAILED: 400,
  DOMAIN_ERROR: 400,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  UNKNOWN: 500,
};

export function crmHttpStatus(code: CrmErrorCode, retryable: boolean): number {
  if (retryable) return 503;
  return CRM_HTTP_STATUS[code] ?? 500;
}

export function crmSuccessResponse<T>(result: Extract<CrmResult<T>, { ok: true }>) {
  return NextResponse.json({ ...result.data, duplicate: result.duplicate ?? false });
}

export function crmErrorResponse(result: Extract<CrmResult<unknown>, { ok: false }>) {
  return NextResponse.json(
    {
      error: result.message,
      code: result.code,
      retryable: result.retryable,
    },
    { status: crmHttpStatus(result.code, result.retryable) },
  );
}

export function crmRouteResponse<T>(result: CrmResult<T>) {
  return result.ok ? crmSuccessResponse(result) : crmErrorResponse(result);
}
