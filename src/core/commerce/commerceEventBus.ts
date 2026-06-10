import type { CommerceEventEnvelope } from './commerceEventTypes';

export interface ICommerceEventStore {
  append(event: CommerceEventEnvelope): Promise<void>;
  findByEntity(entityType: string, entityId: string, options?: { limit?: number }): Promise<CommerceEventEnvelope[]>;
  findByRelatedOrder(orderId: string, options?: { limit?: number }): Promise<CommerceEventEnvelope[]>;
  findByCorrelationId(correlationId: string, options?: { limit?: number }): Promise<CommerceEventEnvelope[]>;
  listAll(options?: { limit?: number }): Promise<CommerceEventEnvelope[]>;
}

export interface ICommerceEventBus {
  publish(event: CommerceEventEnvelope): Promise<void>;
  publishMany(events: CommerceEventEnvelope[]): Promise<void>;
}

export class CommerceEventBus implements ICommerceEventBus {
  constructor(private store: ICommerceEventStore) {}

  async publish(event: CommerceEventEnvelope): Promise<void> {
    await this.store.append(event);
  }

  async publishMany(events: CommerceEventEnvelope[]): Promise<void> {
    for (const event of events) {
      await this.store.append(event);
    }
  }
}
