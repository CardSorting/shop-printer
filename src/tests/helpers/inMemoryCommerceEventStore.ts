import type { ICommerceEventStore } from '@core/commerce/commerceEventBus';
import type { CommerceEventEnvelope } from '@core/commerce/commerceEventTypes';

export class InMemoryCommerceEventStore implements ICommerceEventStore {
  readonly events: CommerceEventEnvelope[] = [];

  async append(event: CommerceEventEnvelope): Promise<void> {
    if (this.events.some((existing) => existing.id === event.id)) return;
    this.events.push(event);
  }

  async findByEntity(entityType: string, entityId: string, options?: { limit?: number }) {
    const limit = options?.limit ?? 100;
    return this.events
      .filter((event) => event.entity.type === entityType && event.entity.id === entityId)
      .sort((a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime())
      .slice(0, limit);
  }

  async findByRelatedOrder(orderId: string, options?: { limit?: number }) {
    const limit = options?.limit ?? 200;
    return this.events
      .filter((event) => event.relatedOrderId === orderId)
      .sort((a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime())
      .slice(0, limit);
  }

  async findByCorrelationId(correlationId: string, options?: { limit?: number }) {
    const limit = options?.limit ?? 200;
    return this.events
      .filter((event) => event.correlationId === correlationId)
      .sort((a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime())
      .slice(0, limit);
  }

  async listAll(options?: { limit?: number }) {
    const limit = options?.limit ?? 200;
    return [...this.events]
      .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())
      .slice(0, limit);
  }
}
