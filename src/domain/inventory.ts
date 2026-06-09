/**
 * [LAYER: DOMAIN]
 * Inventory protocol types — ledger is audit truth, stock count is derived/cached.
 */

export type InventoryReservationState =
  | 'available'
  | 'reserved'
  | 'committed'
  | 'released'
  | 'expired'
  | 'oversold_review'
  | 'reconciliation_required';

export type InventoryLedgerReason =
  | 'reservation_created'
  | 'reservation_confirmed'
  | 'reservation_released'
  | 'reservation_expired'
  | 'admin_adjustment'
  | 'reconciliation'
  | 'location_receive';

export type InventoryActor = 'checkout' | 'fulfillment' | 'admin' | 'system';

export interface InventoryLineItem {
  productId: string;
  variantId?: string;
  quantity: number;
}

export interface InventoryLedgerEntry {
  id: string;
  productId: string;
  variantId?: string;
  locationId?: string;
  purchaseOrderId?: string;
  reservationId?: string;
  orderId?: string;
  delta: number;
  reason: InventoryLedgerReason;
  actor: InventoryActor;
  idempotencyKey: string;
  createdAt: string;
}

export interface InventoryReservation {
  id: string;
  orderId: string;
  state: InventoryReservationState;
  lines: InventoryLineItem[];
  idempotencyKey: string;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
  confirmedAt?: string;
  releasedAt?: string;
}

export interface InventoryReconciliationCase {
  id: string;
  productId: string;
  variantId?: string;
  reservationId?: string;
  orderId?: string;
  reportedStock: number;
  expectedStock: number;
  discrepancy: number;
  state: 'oversold_review' | 'reconciliation_required';
  createdAt: string;
  resolvedAt?: string;
}
