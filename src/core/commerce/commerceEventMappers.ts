import type { AdminOperatorEvent } from '../admin/adminTypes';
import type { RefundExecutionEvent } from '../refund/refundEventLog';
import type { SupportEvent } from '../support/supportEventLog';
import type { InventoryLedgerEntry } from '@domain/inventory';
import { orderCorrelationId } from './correlation';
import type {
  CommerceActorType,
  CommerceEventEnvelope,
  CommerceProtocol,
} from './commerceEventTypes';

function mapActorType(source: string | undefined): CommerceActorType {
  if (source === 'concierge') return 'concierge';
  if (source === 'admin' || source === 'owner') return 'admin';
  if (source === 'customer' || source === 'user') return 'user';
  return 'system';
}

function adminTargetToEntityType(targetType: AdminOperatorEvent['targetType']) {
  switch (targetType) {
    case 'order':
      return 'order' as const;
    case 'purchase_order':
      return 'purchase_order' as const;
    case 'user':
      return 'customer' as const;
    case 'inventory':
      return 'inventory' as const;
    default:
      return 'order' as const;
  }
}

export function mapRefundEventToEnvelope(event: RefundExecutionEvent): CommerceEventEnvelope<RefundExecutionEvent> {
  return {
    id: event.id,
    type: 'refund.created',
    protocol: 'refund',
    actor: {
      id: event.actorId,
      type: mapActorType(event.source),
    },
    entity: { type: 'refund', id: event.stripeRefundId ?? event.idempotencyKey },
    correlationId: orderCorrelationId(event.orderId),
    idempotencyKey: event.idempotencyKey,
    relatedOrderId: event.orderId,
    occurredAt: event.createdAt,
    payload: event,
  };
}

export function mapSupportEventToEnvelope(event: SupportEvent): CommerceEventEnvelope<SupportEvent> {
  const entityId = event.ticketId ?? event.idempotencyKey;
  return {
    id: event.id,
    type: event.action,
    protocol: 'support',
    actor: {
      id: event.actorId,
      type: mapActorType(event.source),
    },
    entity: { type: 'ticket', id: entityId },
    correlationId: event.orderId ? orderCorrelationId(event.orderId) : event.ticketId,
    idempotencyKey: event.idempotencyKey,
    relatedOrderId: event.orderId,
    relatedTicketId: event.ticketId,
    relatedCustomerId: event.customerId,
    occurredAt: event.createdAt,
    payload: event,
  };
}

export function mapAdminEventToEnvelope(event: AdminOperatorEvent): CommerceEventEnvelope<AdminOperatorEvent> {
  const entityType = adminTargetToEntityType(event.targetType);
  return {
    id: event.id,
    type: `admin.${event.action}`,
    protocol: 'admin',
    actor: {
      id: event.actorId,
      type: mapActorType(event.actorRole),
    },
    entity: { type: entityType, id: event.targetId },
    correlationId: entityType === 'order' ? orderCorrelationId(event.targetId) : undefined,
    idempotencyKey: event.idempotencyKey,
    relatedOrderId: entityType === 'order' ? event.targetId : undefined,
    relatedCustomerId: entityType === 'customer' ? event.targetId : undefined,
    occurredAt: event.createdAt,
    payload: event,
  };
}

export function mapCrmEventToEnvelope(event: {
  id: string;
  action: string;
  customerId: string;
  actorId: string;
  reason?: string;
  before?: unknown;
  after?: unknown;
  idempotencyKey: string;
  createdAt: string;
}): CommerceEventEnvelope {
  return {
    id: event.id,
    type: `crm.${event.action}`,
    protocol: 'crm',
    actor: { id: event.actorId, type: 'admin' },
    entity: { type: 'customer', id: event.customerId },
    idempotencyKey: event.idempotencyKey,
    relatedCustomerId: event.customerId,
    occurredAt: event.createdAt,
    payload: {
      action: event.action,
      customerId: event.customerId,
      reason: event.reason,
      before: event.before,
      after: event.after,
    },
  };
}

export function mapInventoryLedgerToEnvelope(entry: InventoryLedgerEntry): CommerceEventEnvelope<InventoryLedgerEntry> {
  const typeMap: Record<string, string> = {
    reservation_created: 'inventory.reserved',
    reservation_confirmed: 'inventory.committed',
    reservation_released: 'inventory.released',
    reservation_expired: 'inventory.expired',
    admin_adjustment: 'inventory.adjusted',
    reconciliation: 'inventory.reconciled',
    location_receive: 'inventory.received',
  };

  return {
    id: entry.id,
    type: typeMap[entry.reason] ?? `inventory.${entry.reason}`,
    protocol: 'inventory',
    actor: { id: entry.actor, type: entry.actor === 'admin' ? 'admin' : 'system' },
    entity: { type: 'inventory', id: entry.productId },
    correlationId: entry.orderId ? orderCorrelationId(entry.orderId) : undefined,
    idempotencyKey: entry.idempotencyKey,
    relatedOrderId: entry.orderId,
    occurredAt: entry.createdAt,
    payload: entry,
  };
}

export function mapCheckoutEventToEnvelope(input: {
  id: string;
  type: string;
  orderId: string;
  correlationId?: string;
  idempotencyKey?: string;
  actorId?: string;
  actorType?: CommerceActorType;
  occurredAt?: string;
  payload?: Record<string, unknown>;
}): CommerceEventEnvelope {
  return {
    id: input.id,
    type: input.type,
    protocol: 'checkout' as CommerceProtocol,
    actor: input.actorId
      ? { id: input.actorId, type: input.actorType ?? 'system' }
      : undefined,
    entity: { type: 'order', id: input.orderId },
    correlationId: input.correlationId ?? orderCorrelationId(input.orderId),
    idempotencyKey: input.idempotencyKey,
    relatedOrderId: input.orderId,
    occurredAt: input.occurredAt ?? new Date().toISOString(),
    payload: {
      orderId: input.orderId,
      ...(input.payload ?? {}),
    },
  };
}
