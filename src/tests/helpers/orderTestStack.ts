import { OrderService } from '../../core/OrderService';
import { createCheckoutStack } from '../../core/order/createCheckoutStack';
import { createInventoryStack } from '../../core/inventory/createInventoryStack';
import type { CheckoutFlowService } from '../../core/order/CheckoutFlowService';
import type { CheckoutMutationBackend } from '../../core/order/checkoutMutationBackend';
import type { InventoryApplicationService } from '../../core/inventory/inventoryApplicationService';
import {
  InMemoryInventoryLedgerRepository,
  InMemoryInventoryReconciliationRepository,
  InMemoryInventoryReservationRepository,
} from './inMemoryInventoryStores';
import { InMemoryCheckoutEventLog } from './inMemoryCheckoutEventLog';

export type OrderTestStackMocks = {
  orderRepo: any;
  productRepo: any;
  cartRepo: any;
  discountRepo: any;
  audit: any;
  locker: any;
  shippingRepo?: any;
  stripe?: any;
  eventLog?: InMemoryCheckoutEventLog;
  inventory?: InventoryApplicationService;
  ledgerRepo?: InMemoryInventoryLedgerRepository;
  reservationRepo?: InMemoryInventoryReservationRepository;
};

export function createOrderTestStack(mocks: OrderTestStackMocks): {
  orderService: OrderService;
  checkout: CheckoutFlowService;
  mutations: CheckoutMutationBackend;
  inventory: InventoryApplicationService;
} {
  const ledgerRepo = mocks.ledgerRepo ?? new InMemoryInventoryLedgerRepository();
  const reservationRepo = mocks.reservationRepo ?? new InMemoryInventoryReservationRepository();
  const reconciliationRepo = new InMemoryInventoryReconciliationRepository();
  const shippingRepo = mocks.shippingRepo ?? {
    getAllZones: async () => [{ id: 'test-us', name: 'United States', countries: ['US'] }],
    getAllRates: async () => [{
      id: 'test-standard',
      name: 'Test Standard',
      amount: 0,
      type: 'price_based',
      minLimit: 0,
      maxLimit: Number.MAX_SAFE_INTEGER,
      shippingZoneId: 'test-us',
    }],
  };
  const inventory = mocks.inventory ?? createInventoryStack({
    productRepo: mocks.productRepo,
    ledgerRepo,
    reservationRepo,
    reconciliationRepo,
  }).inventory;

  const orderService = new OrderService(
    mocks.orderRepo,
    mocks.productRepo,
    mocks.discountRepo,
    mocks.audit,
    shippingRepo,
    undefined,
    inventory,
  );
  const { checkout, mutations } = createCheckoutStack({
    orderRepo: mocks.orderRepo,
    productRepo: mocks.productRepo,
    cartRepo: mocks.cartRepo,
    discountRepo: mocks.discountRepo,
    audit: mocks.audit,
    locker: mocks.locker,
    shippingRepo,
    stripe: mocks.stripe,
    eventLog: mocks.eventLog ?? new InMemoryCheckoutEventLog(),
    inventory,
    cancelExpiredPendingOrder: (orderId) => orderService.cancelExpiredPendingOrder(orderId),
    recordOperatorAction: (input) => orderService.handleReconciliationOperatorAction(input),
  });
  return { orderService, checkout, mutations, inventory };
}
