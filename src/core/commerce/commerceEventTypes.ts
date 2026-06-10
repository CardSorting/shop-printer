import type { AdminOperatorEvent } from '../admin/adminTypes';
import type { RefundExecutionEvent } from '../refund/refundEventLog';
import type { SupportEvent } from '../support/supportEventLog';
import type { InventoryLedgerEntry } from '@domain/inventory';

export type CommerceActorType = 'user' | 'admin' | 'system' | 'concierge';

export type CommerceEntityType =
  | 'order'
  | 'refund'
  | 'inventory'
  | 'ticket'
  | 'customer'
  | 'purchase_order';

export type CommerceProtocol = 'checkout' | 'refund' | 'inventory' | 'admin' | 'support' | 'crm';

export interface CommerceEventEnvelope<T = Record<string, unknown>> {
  id: string;
  type: string;
  protocol: CommerceProtocol;
  actor?: {
    id: string;
    type: CommerceActorType;
  };
  entity: {
    type: CommerceEntityType;
    id: string;
  };
  correlationId?: string;
  idempotencyKey?: string;
  relatedOrderId?: string;
  relatedTicketId?: string;
  relatedCustomerId?: string;
  occurredAt: string;
  payload: T;
}

export type CheckoutEventPayload = {
  orderId: string;
  status?: string;
  paymentState?: string;
  stripeEventId?: string;
  amount?: number;
};

export type RefundEventPayload = RefundExecutionEvent;
export type SupportEventPayload = SupportEvent;
export type AdminEventPayload = AdminOperatorEvent;
export type InventoryEventPayload = InventoryLedgerEntry;
export type CrmEventPayload = {
  action: string;
  customerId: string;
  reason?: string;
  before?: unknown;
  after?: unknown;
};

export type CommerceEvent =
  | CommerceEventEnvelope<CheckoutEventPayload>
  | CommerceEventEnvelope<RefundEventPayload>
  | CommerceEventEnvelope<InventoryEventPayload>
  | CommerceEventEnvelope<AdminEventPayload>
  | CommerceEventEnvelope<SupportEventPayload>
  | CommerceEventEnvelope<CrmEventPayload>;

export type OrderTimelineEntry = {
  id: string;
  type: string;
  protocol: CommerceProtocol;
  label: string;
  occurredAt: string;
  actor?: CommerceEventEnvelope['actor'];
  correlationId?: string;
  idempotencyKey?: string;
  payload: Record<string, unknown>;
};
