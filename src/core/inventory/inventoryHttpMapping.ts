import type { InventoryErrorCode } from './inventoryResult';

const INVENTORY_HTTP_STATUS: Record<InventoryErrorCode, number> = {
  INSUFFICIENT_STOCK: 409,
  PRODUCT_NOT_FOUND: 404,
  RESERVATION_NOT_FOUND: 404,
  RESERVATION_INVALID_STATE: 409,
  RECONCILIATION_REQUIRED: 409,
  LOCATION_RECEIVE_FAILED: 503,
  OVERSELL_DETECTED: 409,
  INVALID_INPUT: 400,
  DOMAIN_ERROR: 422,
  UNKNOWN: 500,
};

export function inventoryErrorHttpStatus(code: InventoryErrorCode): number {
  return INVENTORY_HTTP_STATUS[code] ?? 500;
}
