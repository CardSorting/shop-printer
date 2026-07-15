/**
 * [LAYER: INFRASTRUCTURE]
 */
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  setDoc,
  updateDoc,
  where,
  getUnifiedDb,
  type QueryDocumentSnapshot,
} from '../../firebase/bridge';
import type { IInventoryReservationRepository } from '@domain/repositories';
import type { InventoryReservation, InventoryReservationState } from '@domain/inventory';
import * as crypto from 'node:crypto';

export class FirestoreInventoryReservationRepository implements IInventoryReservationRepository {
  private readonly collectionName = 'inventory_reservations';

  async create(
    reservation: Omit<InventoryReservation, 'id' | 'createdAt' | 'updatedAt'>,
    transaction?: unknown,
  ): Promise<InventoryReservation> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const record: InventoryReservation = {
      ...reservation,
      id,
      createdAt: now,
      updatedAt: now,
    };
    const docRef = doc(getUnifiedDb(), this.collectionName, id);

    if (transaction) {
      (transaction as { set: (ref: unknown, data: unknown) => void }).set(docRef, record);
    } else {
      await setDoc(docRef, record);
    }
    return record;
  }

  async getById(id: string, transaction?: unknown): Promise<InventoryReservation | null> {
    const docRef = doc(getUnifiedDb(), this.collectionName, id);
    const snap = transaction
      ? await (transaction as { get: (ref: unknown) => Promise<{ exists: () => boolean; data: () => unknown }> }).get(docRef)
      : await getDoc(docRef);
    if (!snap.exists()) return null;
    return snap.data() as InventoryReservation;
  }

  async getByOrderId(orderId: string, transaction?: unknown): Promise<InventoryReservation | null> {
    const q = query(
      collection(getUnifiedDb(), this.collectionName),
      where('orderId', '==', orderId),
      limit(1),
    );
    if (transaction) {
      const snapshot = await (transaction as { get: (q: unknown) => Promise<{ empty: boolean; docs: Array<{ data: () => unknown }> }> }).get(q);
      if (snapshot.empty) return null;
      return snapshot.docs[0].data() as InventoryReservation;
    }
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    return snapshot.docs[0].data() as InventoryReservation;
  }

  async getByIdempotencyKey(key: string, transaction?: unknown): Promise<InventoryReservation | null> {
    const q = query(
      collection(getUnifiedDb(), this.collectionName),
      where('idempotencyKey', '==', key),
      limit(1),
    );
    if (transaction) {
      const snapshot = await (transaction as { get: (q: unknown) => Promise<{ empty: boolean; docs: Array<{ data: () => unknown }> }> }).get(q);
      if (snapshot.empty) return null;
      return snapshot.docs[0].data() as InventoryReservation;
    }
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    return snapshot.docs[0].data() as InventoryReservation;
  }

  async updateState(
    id: string,
    state: InventoryReservationState,
    updates?: Partial<Pick<InventoryReservation, 'confirmedAt' | 'releasedAt'>>,
    transaction?: unknown,
  ): Promise<InventoryReservation> {
    const docRef = doc(getUnifiedDb(), this.collectionName, id);
    const existing = await this.getById(id, transaction);
    if (!existing) throw new Error(`Reservation ${id} not found`);

    const next: InventoryReservation = {
      ...existing,
      ...updates,
      state,
      updatedAt: new Date().toISOString(),
    };

    if (transaction) {
      (transaction as { update: (ref: unknown, data: unknown) => void }).update(docRef, next);
    } else {
      await updateDoc(docRef, next as unknown as Record<string, unknown>);
    }
    return next;
  }

  async listExpiredReserved(before: string, max = 100): Promise<InventoryReservation[]> {
    const q = query(
      collection(getUnifiedDb(), this.collectionName),
      where('state', '==', 'reserved'),
      where('expiresAt', '<', before),
      limit(max),
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d: QueryDocumentSnapshot) => d.data() as InventoryReservation);
  }
}
