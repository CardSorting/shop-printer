import type { CheckoutApplicationService } from '../order/checkoutApplicationService';
import type { InventoryApplicationService } from '../inventory/inventoryApplicationService';
import type { IInventoryLocationRepository } from '@domain/repositories';
import type { OrderService } from '../OrderService';
import type { OrderQueryService } from '../OrderQueryService';
import type { PurchaseOrderService } from '../PurchaseOrderService';
import type { AuthService } from '../AuthService';
import type { RefundApplicationService } from '../refund/refundApplicationService';
import { ProductService } from '../ProductService';
import { AdminFlowService } from './AdminFlowService';
import { ProductAdminService } from './ProductAdminService';
import { LocationAdminService } from './LocationAdminService';
import type { IAdminOperatorEventLog } from './adminOperatorEventLog';
import type { ICommerceEventBus } from '../commerce/commerceEventBus';

export type AdminStackDeps = {
  checkout: CheckoutApplicationService;
  inventory: InventoryApplicationService;
  orderService: OrderService;
  orderQueryService: OrderQueryService;
  purchaseOrderService: PurchaseOrderService;
  authService: AuthService;
  productService: ProductService;
  inventoryLocationRepo: IInventoryLocationRepository;
  refunds: RefundApplicationService;
  operatorEventLog: IAdminOperatorEventLog;
  commerceEventBus?: ICommerceEventBus;
};

export type AdminStack = {
  admin: AdminFlowService;
};

/**
 * Single construction path for admin orchestration.
 * Container and tests should use this instead of wiring AdminFlowService directly.
 */
export function createAdminStack(deps: AdminStackDeps): AdminStack {
  const productAdmin = new ProductAdminService(deps.productService);
  const locationAdmin = new LocationAdminService(deps.inventoryLocationRepo);
  const admin = new AdminFlowService({
    checkout: deps.checkout,
    inventory: deps.inventory,
    orderService: deps.orderService,
    orderQueryService: deps.orderQueryService,
    purchaseOrderService: deps.purchaseOrderService,
    authService: deps.authService,
    productAdmin,
    locationAdmin,
    refunds: deps.refunds,
    operatorEventLog: deps.operatorEventLog,
    commerceEventBus: deps.commerceEventBus,
  });
  return { admin };
}
