import type { PurchaseOrderStatus, ReceivingDiscrepancyReason, ReceivingLineDisposition } from '@domain/models';
import type { ClosePurchaseOrderInput, CreatePurchaseOrderInput, ReceiveItemsInput } from '@core/PurchaseOrderService';
import { DomainError } from '@domain/errors';
import { optionalString, parseBoundedLimit, requireInteger, requireString } from '@infrastructure/server/apiGuards';

const PURCHASE_ORDER_STATUSES = new Set<PurchaseOrderStatus>(['draft', 'ordered', 'partially_received', 'received', 'closed', 'cancelled']);
const PURCHASE_ORDER_ACTIONS = new Set(['submit', 'cancel', 'close', 'receive']);
const RECEIVING_CONDITIONS = new Set(['new', 'damaged', 'defective']);
const RECEIVING_DISCREPANCY_REASONS = new Set<ReceivingDiscrepancyReason>([
  'missing_items',
  'damaged_items',
  'wrong_item',
  'duplicate_shipment',
  'supplier_substitution',
  'overage',
  'cost_mismatch',
  'other',
]);
const RECEIVING_DISPOSITIONS = new Set<ReceivingLineDisposition>(['add_to_stock', 'quarantine', 'return_to_supplier', 'write_off']);

export function parsePurchaseOrderListOptions(searchParams: URLSearchParams): {
  status?: PurchaseOrderStatus;
  supplier?: string;
  limit?: number;
  offset?: number;
} {
  return {
    status: parsePurchaseOrderStatus(searchParams.get('status')),
    supplier: optionalString(searchParams.get('supplier'), 'supplier'),
    limit: parseBoundedLimit(searchParams.get('limit'), 50, 100),
    offset: parseOffset(searchParams.get('offset')),
  };
}

export function parseSupplierMetricsQuery(searchParams: URLSearchParams): string | undefined {
  return optionalString(searchParams.get('supplierMetrics'), 'supplierMetrics');
}

export function parsePurchaseOrderCreate(body: Record<string, unknown>, user: { id: string; email: string }): CreatePurchaseOrderInput {
  return {
    supplier: requireString(body.supplier, 'supplier'),
    referenceNumber: optionalString(body.referenceNumber, 'referenceNumber'),
    shippingCarrier: optionalString(body.shippingCarrier, 'shippingCarrier'),
    trackingNumber: optionalString(body.trackingNumber, 'trackingNumber'),
    expectedAt: parseOptionalDate(body.expectedAt, 'expectedAt'),
    notes: optionalString(body.notes, 'notes'),
    items: parseCreateItems(body.items),
    adminUserId: user.id,
    adminUserEmail: user.email,
  };
}

export function parsePurchaseOrderAction(body: Record<string, unknown>): 'submit' | 'cancel' | 'close' | 'receive' {
  const action = requireString(body.action, 'action');
  if (!PURCHASE_ORDER_ACTIONS.has(action)) throw new DomainError('Unknown purchase order action.');
  return action as 'submit' | 'cancel' | 'close' | 'receive';
}

export function parseClosePurchaseOrder(body: Record<string, unknown>, id: string): ClosePurchaseOrderInput {
  return {
    id,
    discrepancyReason: parseDiscrepancyReason(body.discrepancyReason, false),
    notes: optionalString(body.notes, 'notes'),
  };
}

export function parseReceiveItems(body: Record<string, unknown>, id: string, receivedBy: string): ReceiveItemsInput {
  return {
    purchaseOrderId: id,
    receivedBy,
    idempotencyKey: optionalString(body.idempotencyKey, 'idempotencyKey'),
    items: parseReceiveItemList(body.items),
    notes: optionalString(body.notes, 'notes'),
    locationId: optionalString(body.locationId, 'locationId'),
  };
}

function parsePurchaseOrderStatus(value: unknown): PurchaseOrderStatus | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value === 'string' && PURCHASE_ORDER_STATUSES.has(value as PurchaseOrderStatus)) return value as PurchaseOrderStatus;
  throw new DomainError('Purchase order status is invalid.');
}

function parseCreateItems(value: unknown): CreatePurchaseOrderInput['items'] {
  if (!Array.isArray(value) || value.length === 0) throw new DomainError('At least one purchase order item is required.');
  if (value.length > 100) throw new DomainError('Purchase orders are limited to 100 line items.');
  const seen = new Set<string>();
  return value.map((item, index) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) throw new DomainError(`items[${index}] must be a JSON object.`);
    const body = item as Record<string, unknown>;
    const productId = requireString(body.productId, `items[${index}].productId`);
    if (seen.has(productId)) throw new DomainError(`Duplicate product ${productId} in purchase order.`);
    seen.add(productId);
    const orderedQty = requirePositiveInteger(body.orderedQty, `items[${index}].orderedQty`);
    const unitCost = requireNonNegativeInteger(body.unitCost, `items[${index}].unitCost`);
    return {
      productId,
      orderedQty,
      unitCost,
      notes: optionalString(body.notes, `items[${index}].notes`),
    };
  });
}

function parseReceiveItemList(value: unknown): ReceiveItemsInput['items'] {
  if (!Array.isArray(value) || value.length === 0) throw new DomainError('At least one received item is required.');
  if (value.length > 100) throw new DomainError('Receiving sessions are limited to 100 line items.');
  const seen = new Set<string>();
  return value.map((item, index) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) throw new DomainError(`items[${index}] must be a JSON object.`);
    const body = item as Record<string, unknown>;
    const purchaseOrderItemId = requireString(body.purchaseOrderItemId, `items[${index}].purchaseOrderItemId`);
    if (seen.has(purchaseOrderItemId)) throw new DomainError(`Duplicate received line ${purchaseOrderItemId}.`);
    seen.add(purchaseOrderItemId);
    const condition = requireString(body.condition, `items[${index}].condition`);
    if (!RECEIVING_CONDITIONS.has(condition)) throw new DomainError(`items[${index}].condition is invalid.`);
    return {
      purchaseOrderItemId,
      receivedQty: requirePositiveInteger(body.receivedQty, `items[${index}].receivedQty`),
      damagedQty: body.damagedQty === undefined ? undefined : requireNonNegativeInteger(body.damagedQty, `items[${index}].damagedQty`),
      condition: condition as 'new' | 'damaged' | 'defective',
      discrepancyReason: parseDiscrepancyReason(body.discrepancyReason, false),
      disposition: parseDisposition(body.disposition),
      notes: optionalString(body.notes, `items[${index}].notes`),
    };
  });
}

function parseDiscrepancyReason(value: unknown, required: true): ReceivingDiscrepancyReason;
function parseDiscrepancyReason(value: unknown, required?: false): ReceivingDiscrepancyReason | undefined;
function parseDiscrepancyReason(value: unknown, required = false): ReceivingDiscrepancyReason | undefined {
  if (value === undefined || value === null || value === '') {
    if (required) throw new DomainError('discrepancyReason is required.');
    return undefined;
  }
  if (typeof value === 'string' && RECEIVING_DISCREPANCY_REASONS.has(value as ReceivingDiscrepancyReason)) {
    return value as ReceivingDiscrepancyReason;
  }
  throw new DomainError('discrepancyReason is invalid.');
}

function parseDisposition(value: unknown): ReceivingLineDisposition | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value === 'string' && RECEIVING_DISPOSITIONS.has(value as ReceivingLineDisposition)) {
    return value as ReceivingLineDisposition;
  }
  throw new DomainError('disposition is invalid.');
}

function parseOptionalDate(value: unknown, field: string): Date | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value !== 'string') throw new DomainError(`${field} must be a date string.`);
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new DomainError(`${field} must be a valid date.`);
  return date;
}

function parseOffset(value: string | null): number | undefined {
  if (value === null || value === '') return undefined;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) throw new DomainError('offset must be a non-negative whole number.');
  return parsed;
}

function requirePositiveInteger(value: unknown, field: string): number {
  const number = requireInteger(value, field);
  if (number <= 0) throw new DomainError(`${field} must be greater than zero.`);
  return number;
}

function requireNonNegativeInteger(value: unknown, field: string): number {
  const number = requireInteger(value, field);
  if (number < 0) throw new DomainError(`${field} must be zero or greater.`);
  return number;
}
