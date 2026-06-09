import { NextResponse } from 'next/server';
import { inventoryErrorHttpStatus } from '@core/inventory/inventoryHttpMapping';
import type { InventoryErrorCode, InventoryResult } from '@core/inventory/inventoryResult';

export function inventoryHttpStatus(code: InventoryErrorCode, retryable: boolean): number {
  if (retryable && code === 'UNKNOWN') return 503;
  return inventoryErrorHttpStatus(code);
}

export function inventorySuccessResponse<T>(result: Extract<InventoryResult<T>, { ok: true }>) {
  return NextResponse.json({ ...result.data, duplicate: result.duplicate ?? false });
}

export function inventoryErrorResponse(result: Extract<InventoryResult<unknown>, { ok: false }>) {
  return NextResponse.json(
    {
      error: result.message,
      code: result.code,
      retryable: result.retryable,
    },
    { status: inventoryHttpStatus(result.code, result.retryable) },
  );
}

export function inventoryRouteResponse<T>(result: InventoryResult<T>) {
  return result.ok ? inventorySuccessResponse(result) : inventoryErrorResponse(result);
}

/** 207 Multi-Status when cleanup completed with per-item failures in the report. */
export function inventoryPartialReportResponse<T extends { failed?: number; errors?: unknown[] }>(
  result: Extract<InventoryResult<T>, { ok: true }>,
) {
  const partial = (result.data.failed ?? 0) > 0 || (result.data.errors?.length ?? 0) > 0;
  return NextResponse.json(
    { ...result.data, duplicate: result.duplicate ?? false },
    { status: partial ? 207 : 200 },
  );
}
