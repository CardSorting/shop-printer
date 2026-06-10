import type {
  IInventoryLedgerRepository,
  IInventoryLevelRepository,
  IInventoryReconciliationRepository,
  IInventoryReservationRepository,
  IProductRepository,
} from '@domain/repositories';
import { InventoryFlowService } from './InventoryFlowService';
import type { InventoryReleaseReason } from './inventoryApplicationService';
import { InventoryLedgerService } from './InventoryLedgerService';
import { InventoryMutationService } from './InventoryMutationService';
import { InventoryReservationService } from './InventoryReservationService';
import type { InventoryApplicationService } from './inventoryApplicationService';
import type { ICommerceEventBus } from '../commerce/commerceEventBus';

export type InventoryStackDeps = {
  productRepo: IProductRepository;
  ledgerRepo: IInventoryLedgerRepository;
  reservationRepo: IInventoryReservationRepository;
  reconciliationRepo?: IInventoryReconciliationRepository;
  inventoryLevelRepo?: IInventoryLevelRepository;
  reservationTtlMs?: number;
  onReservationReleased?: (input: { orderId: string; reason?: InventoryReleaseReason }) => Promise<void>;
  commerceEventBus?: ICommerceEventBus;
};

export type InventoryStack = {
  inventory: InventoryApplicationService;
  mutations: InventoryMutationService;
  reservations: InventoryReservationService;
  ledger: InventoryLedgerService;
};

/**
 * Single construction path for inventory orchestration.
 * Container and tests should use this instead of wiring services directly.
 */
export function createInventoryStack(deps: InventoryStackDeps): InventoryStack {
  const ledger = new InventoryLedgerService(deps.ledgerRepo, deps.commerceEventBus);
  const mutations = new InventoryMutationService(deps.productRepo, ledger);
  const reservations = new InventoryReservationService(deps.reservationRepo, deps.reconciliationRepo);
  const inventory = new InventoryFlowService(
    mutations,
    reservations,
    ledger,
    deps.productRepo,
    {
      reservationTtlMs: deps.reservationTtlMs,
      onReservationReleased: deps.onReservationReleased,
      inventoryLevelRepo: deps.inventoryLevelRepo,
    },
  );
  return { inventory, mutations, reservations, ledger };
}
