import { NextResponse } from 'next/server';
import type { CheckoutErrorCode, CheckoutResult } from '@core/order/checkoutResult';

const CHECKOUT_HTTP_STATUS: Partial<Record<CheckoutErrorCode, number>> = {
  DOMAIN_ERROR: 400,
  FORBIDDEN: 403,
  SESSION_CREATE_FAILED: 500,
  WEBHOOK_INVALID_SIGNATURE: 400,
  WEBHOOK_IN_PROGRESS: 503,
  WEBHOOK_PROCESSING_FAILED: 500,
  SESSION_CREATE_FAILED: 400,
  PAYMENT_METHOD_FAILED: 400,
  VERIFICATION_FAILED: 400,
  RECOVERY_FAILED: 400,
  OPERATOR_ACTION_FAILED: 400,
  CHECKOUT_NOT_CONFIGURED: 503,
  STRIPE_NOT_CONFIGURED: 503,
  OPERATOR_NOT_CONFIGURED: 503,
  CLEANUP_NOT_CONFIGURED: 503,
  UNKNOWN: 500,
};

export function checkoutHttpStatus(code: CheckoutErrorCode, retryable: boolean): number {
  if (retryable && code === 'UNKNOWN') return 503;
  return CHECKOUT_HTTP_STATUS[code] ?? 500;
}

export function checkoutSuccessResponse<T>(result: Extract<CheckoutResult<T>, { ok: true }>) {
  return NextResponse.json(result.data);
}

export function checkoutErrorResponse(result: Extract<CheckoutResult<unknown>, { ok: false }>) {
  return NextResponse.json(
    {
      error: result.message,
      code: result.code,
      retryable: result.retryable,
    },
    { status: checkoutHttpStatus(result.code, result.retryable) },
  );
}

export function checkoutRouteResponse<T>(result: CheckoutResult<T>) {
  return result.ok ? checkoutSuccessResponse(result) : checkoutErrorResponse(result);
}
