import type { ICommerceEventStore } from './commerceEventBus';
import type { CommerceEventEnvelope, OrderTimelineEntry } from './commerceEventTypes';

const TIMELINE_LABELS: Record<string, string> = {
  'checkout.session_created': 'Checkout created',
  'checkout.payment_confirmed': 'Payment confirmed',
  'refund.created': 'Refund completed',
  'inventory.reserved': 'Inventory reserved',
  'inventory.committed': 'Inventory committed',
  'inventory.released': 'Inventory released',
  'inventory.adjusted': 'Inventory adjusted',
  'ticket.created': 'Support ticket opened',
  'ticket.message_added': 'Support message added',
  'ticket.linked_order': 'Ticket linked to order',
  'ticket.closed': 'Support ticket closed',
  'ticket.reopened': 'Support ticket reopened',
  'ticket.resolved': 'Support ticket resolved',
  'ticket.assigned': 'Support ticket assigned',
  'ticket.updated': 'Support ticket updated',
};

function timelineLabel(type: string): string {
  if (TIMELINE_LABELS[type]) return TIMELINE_LABELS[type];
  if (type.startsWith('admin.')) return type.replace('admin.', 'Admin: ').replace(/_/g, ' ');
  if (type.startsWith('crm.')) return type.replace('crm.', 'CRM: ').replace(/_/g, ' ');
  return type.replace(/[._]/g, ' ');
}

function toTimelineEntry(event: CommerceEventEnvelope): OrderTimelineEntry {
  return {
    id: event.id,
    type: event.type,
    protocol: event.protocol,
    label: timelineLabel(event.type),
    occurredAt: event.occurredAt,
    actor: event.actor,
    correlationId: event.correlationId,
    idempotencyKey: event.idempotencyKey,
    payload: event.payload as Record<string, unknown>,
  };
}

export class CommerceTimelineService {
  constructor(private store: ICommerceEventStore) {}

  async getOrderTimeline(orderId: string, options?: { limit?: number }): Promise<OrderTimelineEntry[]> {
    const byOrder = await this.store.findByRelatedOrder(orderId, options);
    const byEntity = await this.store.findByEntity('order', orderId, options);
    const merged = new Map<string, CommerceEventEnvelope>();
    for (const event of [...byOrder, ...byEntity]) {
      merged.set(event.id, event);
    }
    return [...merged.values()]
      .sort((a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime())
      .map(toTimelineEntry);
  }

  async getCorrelationTimeline(correlationId: string, options?: { limit?: number }): Promise<OrderTimelineEntry[]> {
    const events = await this.store.findByCorrelationId(correlationId, options);
    return events
      .sort((a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime())
      .map(toTimelineEntry);
  }
}
