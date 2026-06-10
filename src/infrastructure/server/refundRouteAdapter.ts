import { NextResponse } from 'next/server';
import type { RefundErrorCode, RefundResult } from '@core/refund/refundResult';

const REFUND_HTTP_STATUS: Partial<Record<RefundErrorCode, number>> = {
  VALIDATION_FAILED: 400,
  DOMAIN_ERROR: 400,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  ORDER_LOCKED: 409,
  NO_PAYMENT: 400,
  INSUFFICIENT_BALANCE: 400,
  REFUND_IN_PROGRESS: 409,
  PAYMENT_PROCESSOR_FAILED: 402,
  STATE_SYNC_FAILED: 503,
  UNKNOWN: 500,
};

export function refundHttpStatus(code: RefundErrorCode, retryable: boolean): number {
  if (retryable) return 503;
  return REFUND_HTTP_STATUS[code] ?? 500;
}

export function refundSuccessResponse<T>(result: Extract<RefundResult<T>, { ok: true }>) {
  return NextResponse.json({ ...result.data, duplicate: result.duplicate ?? false });
}

export function refundErrorResponse(result: Extract<RefundResult<unknown>, { ok: false }>) {
  return NextResponse.json(
    {
      error: result.message,
      code: result.code,
      retryable: result.retryable,
    },
    { status: refundHttpStatus(result.code, result.retryable) },
  );
}

export function refundRouteResponse<T>(result: RefundResult<T>) {
  return result.ok ? refundSuccessResponse(result) : refundErrorResponse(result);
}
