import { adminDb, FieldValue, withAdminFirestoreRetry } from '@infrastructure/firebase/admin';
import type { ICommerceEventStore } from '@core/commerce/commerceEventBus';
import type { CommerceEventEnvelope } from '@core/commerce/commerceEventTypes';

const EVENTS_COLLECTION = 'commerce_events';

export class FirestoreCommerceEventStore implements ICommerceEventStore {
  async append(event: CommerceEventEnvelope): Promise<void> {
    const ref = adminDb.collection(EVENTS_COLLECTION).doc(event.id);
    await withAdminFirestoreRetry(
      () => ref.set({
        ...event,
        recordedAt: FieldValue.serverTimestamp(),
      }),
      { operationName: 'commerceEventStore.append' },
    );
  }

  async findByEntity(entityType: string, entityId: string, options?: { limit?: number }) {
    const limit = Math.min(Math.max(options?.limit ?? 100, 1), 500);
    const snap = await adminDb
      .collection(EVENTS_COLLECTION)
      .where('entity.type', '==', entityType)
      .where('entity.id', '==', entityId)
      .orderBy('occurredAt', 'asc')
      .limit(limit)
      .get();
    return snap.docs.map((doc) => doc.data() as CommerceEventEnvelope);
  }

  async findByRelatedOrder(orderId: string, options?: { limit?: number }) {
    const limit = Math.min(Math.max(options?.limit ?? 200, 1), 500);
    const snap = await adminDb
      .collection(EVENTS_COLLECTION)
      .where('relatedOrderId', '==', orderId)
      .orderBy('occurredAt', 'asc')
      .limit(limit)
      .get();
    return snap.docs.map((doc) => doc.data() as CommerceEventEnvelope);
  }

  async findByCorrelationId(correlationId: string, options?: { limit?: number }) {
    const limit = Math.min(Math.max(options?.limit ?? 200, 1), 500);
    const snap = await adminDb
      .collection(EVENTS_COLLECTION)
      .where('correlationId', '==', correlationId)
      .orderBy('occurredAt', 'asc')
      .limit(limit)
      .get();
    return snap.docs.map((doc) => doc.data() as CommerceEventEnvelope);
  }

  async listAll(options?: { limit?: number }) {
    const limit = Math.min(Math.max(options?.limit ?? 200, 1), 500);
    const snap = await adminDb
      .collection(EVENTS_COLLECTION)
      .orderBy('occurredAt', 'desc')
      .limit(limit)
      .get();
    return snap.docs.map((doc) => doc.data() as CommerceEventEnvelope);
  }
}
