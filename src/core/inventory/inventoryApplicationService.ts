import type {
  InventoryActor,
  InventoryLedgerEntry,
  InventoryLedgerReason,
  InventoryLineItem,
  InventoryReservationState,
} from '@domain/inventory';
import type { InventoryResult } from './inventoryResult';

export type CheckAvailabilityInput = {
  items: InventoryLineItem[];
};

export type AvailabilityLineResult = {
  productId: string;
  variantId?: string;
  requested: number;
  available: number;
  sufficient: boolean;
};

export type AvailabilityResult = {
  available: boolean;
  lines: AvailabilityLineResult[];
};

export type ReserveInventoryInput = {
  orderId: string;
  items: InventoryLineItem[];
  idempotencyKey: string;
  actor: InventoryActor;
  expiresAt?: string;
  /** @internal Participate in an outer Firestore transaction (checkout). */
  transaction?: unknown;
};

export type ReservationResult = {
  reservationId: string;
  orderId: string;
  state: Extract<InventoryReservationState, 'reserved'>;
  expiresAt: string;
  lines: InventoryLineItem[];
};

export type ConfirmReservationInput = {
  orderId?: string;
  reservationId?: string;
  idempotencyKey: string;
  actor: InventoryActor;
  transaction?: unknown;
};

export type ConfirmReservationResult = {
  reservationId: string;
  orderId: string;
  state: Extract<InventoryReservationState, 'committed'>;
};

export type ReleaseReservationInput = {
  orderId?: string;
  reservationId?: string;
  idempotencyKey: string;
  actor: InventoryActor;
  reason?: InventoryReleaseReason;
  transaction?: unknown;
};

export type InventoryReleaseReason = 'checkout_cancelled' | 'payment_failed' | 'expired' | 'admin' | 'refund';

export type ReleaseReservationResult = {
  reservationId: string;
  orderId: string;
  state: Extract<InventoryReservationState, 'released' | 'expired'>;
  restoredLines: InventoryLineItem[];
};

export type AdjustInventoryInput = {
  updates: { productId: string; variantId?: string; stock: number }[];
  idempotencyKey: string;
  actor: InventoryActor;
  actorUserId?: string;
  actorEmail?: string;
  note?: string;
  transaction?: unknown;
};

export type AdjustmentLineResult = {
  productId: string;
  variantId?: string;
  previousStock: number;
  newStock: number;
  delta: number;
};

export type AdjustmentResult = {
  adjustments: AdjustmentLineResult[];
};

export type ApplyInventoryDeltasInput = {
  deltas: { productId: string; variantId?: string; delta: number }[];
  idempotencyKey: string;
  actor: InventoryActor;
  reason: Extract<InventoryLedgerReason, 'admin_adjustment' | 'reconciliation' | 'location_receive'>;
  orderId?: string;
  purchaseOrderId?: string;
  reservationId?: string;
  transaction?: unknown;
};

export type ApplyDeltasLineResult = {
  productId: string;
  variantId?: string;
  delta: number;
};

export type ApplyDeltasResult = {
  applied: ApplyDeltasLineResult[];
};

export type ReconcileInventoryInput = {
  productIds?: string[];
  actor: InventoryActor;
};

export type ReconciliationLineResult = {
  productId: string;
  variantId?: string;
  reportedStock: number;
  ledgerBalance: number;
  discrepancy: number;
  caseId?: string;
};

export type ReconciliationResult = {
  scanned: number;
  discrepancies: ReconciliationLineResult[];
};

export type CleanupExpiredReservationsInput = {
  before?: string;
  limit?: number;
};

export type InventoryCleanupError = {
  reservationId: string;
  orderId: string;
  code: 'release_failed' | 'not_found';
  message: string;
  retryable: boolean;
};

export type CleanupReservationsReport = {
  scanned: number;
  expired: number;
  released: number;
  failed: number;
  errors: InventoryCleanupError[];
};

export type GetProductLedgerInput = {
  productId: string;
  limit?: number;
};

export type GetProductLedgerResult = {
  productId: string;
  entries: InventoryLedgerEntry[];
};

export type ReceiveStockAtLocationInput = {
  items: { productId: string; variantId?: string; delta: number; locationId: string }[];
  idempotencyKey: string;
  actor: InventoryActor;
  reason: Extract<InventoryLedgerReason, 'location_receive'>;
  purchaseOrderId?: string;
  locationReason?: string;
  transaction?: unknown;
};

export type ReceiveStockLocationError = {
  productId: string;
  locationId: string;
  code: 'location_adjust_failed';
  message: string;
};

export type ReceiveStockAtLocationLineResult = {
  productId: string;
  variantId?: string;
  locationId: string;
  delta: number;
  availableQty: number;
};

export type ReceiveStockAtLocationResult = {
  catalog: ApplyDeltasResult;
  locations: ReceiveStockAtLocationLineResult[];
  rolledBack?: boolean;
  errors?: ReceiveStockLocationError[];
};

/**
 * Public inventory boundary. Routes, checkout, fulfillment, and admin depend only on this interface.
 */
export interface InventoryApplicationService {
  checkAvailability(input: CheckAvailabilityInput): Promise<InventoryResult<AvailabilityResult>>;
  reserveInventory(input: ReserveInventoryInput): Promise<InventoryResult<ReservationResult>>;
  confirmReservation(input: ConfirmReservationInput): Promise<InventoryResult<ConfirmReservationResult>>;
  releaseReservation(input: ReleaseReservationInput): Promise<InventoryResult<ReleaseReservationResult>>;
  adjustInventory(input: AdjustInventoryInput): Promise<InventoryResult<AdjustmentResult>>;
  applyInventoryDeltas(input: ApplyInventoryDeltasInput): Promise<InventoryResult<ApplyDeltasResult>>;
  reconcileInventory(input: ReconcileInventoryInput): Promise<InventoryResult<ReconciliationResult>>;
  cleanupExpiredReservations(input: CleanupExpiredReservationsInput): Promise<InventoryResult<CleanupReservationsReport>>;
  getProductLedger(input: GetProductLedgerInput): Promise<InventoryResult<GetProductLedgerResult>>;
  receiveStockAtLocation(input: ReceiveStockAtLocationInput): Promise<InventoryResult<ReceiveStockAtLocationResult>>;
}
