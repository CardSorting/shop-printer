import type { Product, ProductDraft, ProductUpdate, User, UserRole, Order, OrderNote, InventoryLocation } from '@domain/models';
import type { OrderStatus } from '@domain/models';
import type { AdminDashboardSummary } from '@core/OrderQueryService';
import type { ReconciliationOperatorAction } from '@core/order/checkoutTypes';
import type { ReceiveItemsInput, ClosePurchaseOrderInput } from '@core/PurchaseOrderService';
import type { InventoryLedgerEntry } from '@domain/inventory';
import type { AdminActor } from './adminTypes';
import type { AdminResult } from './adminResult';
import type { PurchaseOrder } from '@domain/models';

export type DashboardResult = AdminDashboardSummary;

export type ListOrdersInput = {
  actor: AdminActor;
  overview?: boolean;
  status?: OrderStatus;
  limit?: number;
  cursor?: string;
};

export type ListOrdersResult = unknown;

export type ResolveReconciliationCaseInput = {
  actor: AdminActor;
  caseId: string;
  action: ReconciliationOperatorAction;
  reason: string;
  idempotencyKey?: string;
};

export type ResolveCaseResult = {
  applied: true;
};

export type CreateProductInput = {
  actor: AdminActor;
  draft: ProductDraft;
  idempotencyKey?: string;
};

export type ProductResult = Product;

export type UpdateProductInput = {
  actor: AdminActor;
  productId: string;
  patch: ProductUpdate;
  idempotencyKey?: string;
};

export type ArchiveProductInput = {
  actor: AdminActor;
  productId: string;
  reason: string;
  idempotencyKey?: string;
};

export type ArchiveProductResult = {
  archived: true;
  productId: string;
};

export type AdjustInventoryInput = {
  actor: AdminActor;
  updates: { productId: string; variantId?: string; stock: number }[];
  idempotencyKey: string;
  reason?: string;
  note?: string;
};

export type InventoryAdjustmentResult = {
  updatedCount: number;
};

export type ReceivePurchaseOrderInput = {
  actor: AdminActor;
  receive: ReceiveItemsInput;
  idempotencyKey?: string;
};

export type ReceivePurchaseOrderResult = {
  purchaseOrderId: string;
  sessionId: string;
  inventoryUpdateCount: number;
};

export type ListUsersInput = {
  actor: AdminActor;
};

export type ListUsersResult = unknown;

export type UpdateUserRoleInput = {
  actor: AdminActor;
  userId: string;
  role: UserRole;
  reason: string;
  idempotencyKey?: string;
};

export type UserRoleResult = User;

export type GetOrderInput = {
  actor: AdminActor;
  orderId: string;
};

export type GetAdminOrderInput = {
  actor: AdminActor;
  orderId: string;
};

export type UpdateOrderStatusInput = {
  actor: AdminActor;
  orderId: string;
  status: OrderStatus;
  reason?: string;
  idempotencyKey?: string;
};

export type UpdateOrderStatusResult = {
  orderId: string;
  status: OrderStatus;
};

export type BatchUpdateOrderStatusInput = {
  actor: AdminActor;
  orderIds: string[];
  status: OrderStatus;
  reason?: string;
  idempotencyKey?: string;
};

export type BatchUpdateOrderStatusResult = {
  updatedIds: string[];
};

export type FulfillOrderInput = {
  actor: AdminActor;
  orderId: string;
  trackingNumber?: string;
  shippingCarrier?: string;
  idempotencyKey?: string;
};

export type FulfillOrderResult = {
  orderId: string;
};

export type ReconcileOrderInput = {
  actor: AdminActor;
  orderId: string;
  resolutionAction: OrderStatus;
  reason: string;
  evidence: string;
  idempotencyKey?: string;
};

export type ReconcileOrderResult = {
  orderId: string;
  resolutionAction: OrderStatus;
};

export type AddOrderNoteInput = {
  actor: AdminActor;
  orderId: string;
  text: string;
  idempotencyKey?: string;
};

export type SubmitPurchaseOrderInput = {
  actor: AdminActor;
  purchaseOrderId: string;
  idempotencyKey?: string;
};

export type CancelPurchaseOrderInput = {
  actor: AdminActor;
  purchaseOrderId: string;
  reason: string;
  idempotencyKey?: string;
};

export type ClosePurchaseOrderAdminInput = {
  actor: AdminActor;
  close: ClosePurchaseOrderInput;
  idempotencyKey?: string;
};

export type PurchaseOrderActionResult = {
  purchaseOrder: PurchaseOrder;
};

export type ListLocationsInput = {
  actor: AdminActor;
};

export type GetLocationInput = {
  actor: AdminActor;
  locationId: string;
};

export type CreateLocationInput = {
  actor: AdminActor;
  location: InventoryLocation;
  idempotencyKey?: string;
};

export type UpdateLocationInput = {
  actor: AdminActor;
  locationId: string;
  patch: Partial<Omit<InventoryLocation, 'id' | 'createdAt'>>;
  idempotencyKey?: string;
};

export type ArchiveLocationInput = {
  actor: AdminActor;
  locationId: string;
  reason: string;
  idempotencyKey?: string;
};

export type LocationResult = InventoryLocation;

export type ArchiveLocationResult = {
  locationId: string;
  archived: true;
};

export type BatchUpdateProductsInput = {
  actor: AdminActor;
  updates: { id: string; updates: ProductUpdate }[];
  idempotencyKey?: string;
};

export type BatchArchiveProductsInput = {
  actor: AdminActor;
  productIds: string[];
  reason: string;
  idempotencyKey?: string;
};

export type BatchArchiveProductsResult = {
  archivedCount: number;
};

export type BatchCreateProductsInput = {
  actor: AdminActor;
  drafts: ProductDraft[];
  idempotencyKey?: string;
};

export type RequestRefundInput = {
  actor: AdminActor;
  orderId: string;
  amount: number;
  reason: string;
  idempotencyKey: string;
};

export type RequestRefundResult = {
  orderId: string;
  amount: number;
  status: Extract<OrderStatus, 'refunded' | 'partially_refunded'>;
  stripeRefundId?: string;
  idempotencyKey: string;
};

/**
 * Public admin boundary. Admin HTTP routes depend only on this interface.
 * Every method returns AdminResult<T> for typed success/failure contracts.
 */
export interface AdminApplicationService {
  listDashboard(input: { actor: AdminActor }): Promise<AdminResult<DashboardResult>>;

  listOrders(input: ListOrdersInput): Promise<AdminResult<ListOrdersResult>>;
  getOrder(input: GetOrderInput): Promise<AdminResult<Order>>;
  getAdminOrder(input: GetAdminOrderInput): Promise<AdminResult<Order>>;
  getRecoveryReadModel(input: { actor: AdminActor; limit?: number }): Promise<AdminResult<unknown>>;
  exportOrdersToPirateShipCsv(input: {
    actor: AdminActor;
    orderIds: string[];
    packageDimensions?: { length: string; width: string; height: string };
    tareWeight?: number;
  }): Promise<AdminResult<string>>;
  resolveReconciliationCase(input: ResolveReconciliationCaseInput): Promise<AdminResult<ResolveCaseResult>>;
  updateOrderStatus(input: UpdateOrderStatusInput): Promise<AdminResult<UpdateOrderStatusResult>>;
  batchUpdateOrderStatus(input: BatchUpdateOrderStatusInput): Promise<AdminResult<BatchUpdateOrderStatusResult>>;
  fulfillOrder(input: FulfillOrderInput): Promise<AdminResult<FulfillOrderResult>>;
  reconcileOrder(input: ReconcileOrderInput): Promise<AdminResult<ReconcileOrderResult>>;
  addOrderNote(input: AddOrderNoteInput): Promise<AdminResult<OrderNote>>;
  requestRefund(input: RequestRefundInput): Promise<AdminResult<RequestRefundResult>>;

  createProduct(input: CreateProductInput): Promise<AdminResult<ProductResult>>;
  updateProduct(input: UpdateProductInput): Promise<AdminResult<ProductResult>>;
  archiveProduct(input: ArchiveProductInput): Promise<AdminResult<ArchiveProductResult>>;
  batchUpdateProducts(input: BatchUpdateProductsInput): Promise<AdminResult<Product[]>>;
  batchArchiveProducts(input: BatchArchiveProductsInput): Promise<AdminResult<BatchArchiveProductsResult>>;
  batchCreateProducts(input: BatchCreateProductsInput): Promise<AdminResult<Product[]>>;

  adjustInventory(input: AdjustInventoryInput): Promise<AdminResult<InventoryAdjustmentResult>>;
  receivePurchaseOrder(input: ReceivePurchaseOrderInput): Promise<AdminResult<ReceivePurchaseOrderResult>>;
  submitPurchaseOrder(input: SubmitPurchaseOrderInput): Promise<AdminResult<PurchaseOrderActionResult>>;
  cancelPurchaseOrder(input: CancelPurchaseOrderInput): Promise<AdminResult<PurchaseOrderActionResult>>;
  closePurchaseOrder(input: ClosePurchaseOrderAdminInput): Promise<AdminResult<PurchaseOrderActionResult>>;

  listLocations(input: ListLocationsInput): Promise<AdminResult<InventoryLocation[]>>;
  getLocation(input: GetLocationInput): Promise<AdminResult<LocationResult>>;
  createLocation(input: CreateLocationInput): Promise<AdminResult<LocationResult>>;
  updateLocation(input: UpdateLocationInput): Promise<AdminResult<LocationResult>>;
  archiveLocation(input: ArchiveLocationInput): Promise<AdminResult<ArchiveLocationResult>>;

  listUsers(input: ListUsersInput): Promise<AdminResult<ListUsersResult>>;
  updateUserRole(input: UpdateUserRoleInput): Promise<AdminResult<UserRoleResult>>;
}

export type { InventoryLedgerEntry };
