import type {
  ConfirmReservationInput,
  ConfirmReservationResult,
  ReleaseReservationInput,
  ReleaseReservationResult,
  ReserveInventoryInput,
  ReservationResult,
} from './inventoryApplicationService';
import type { InventoryResult } from './inventoryResult';

/**
 * Checkout-facing inventory mutation contract. Only checkout mutation flows should call these.
 */
export interface InventoryMutationBackend {
  reserveInventory(input: ReserveInventoryInput): Promise<InventoryResult<ReservationResult>>;
  confirmReservation(input: ConfirmReservationInput): Promise<InventoryResult<ConfirmReservationResult>>;
  releaseReservation(input: ReleaseReservationInput): Promise<InventoryResult<ReleaseReservationResult>>;
}
