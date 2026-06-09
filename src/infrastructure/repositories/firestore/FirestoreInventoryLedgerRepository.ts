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
  where,
  getUnifiedDb,
} from '../../firebase/bridge';
import type { IInventoryLedgerRepository } from '@domain/repositories';
import type { InventoryLedgerEntry } from '@domain/inventory';
import * as crypto from 'node:crypto';

export class FirestoreInventoryLedgerRepository implements IInventoryLedgerRepository {
  private readonly collectionName = 'inventory_ledger';

  async append(
    entry: Omit<InventoryLedgerEntry, 'id' | 'createdAt'>,
    transaction?: unknown,
  ): Promise<InventoryLedgerEntry> {
    const id = crypto.randomUUID();
    const createdAt = new Date().toISOString();
    const record: InventoryLedgerEntry = { ...entry, id, createdAt };
    const docRef = doc(getUnifiedDb(), this.collectionName, id);

    if (transaction) {
      (transaction as { set: (ref: unknown, data: unknown) => void }).set(docRef, record);
    } else {
      await setDoc(docRef, record);
    }
    return record;
  }

  async findByIdempotencyKey(key: string): Promise<InventoryLedgerEntry | null> {
    const q = query(
      collection(getUnifiedDb(), this.collectionName),
      where('idempotencyKey', '==', key),
      limit(1),
    );
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    return snapshot.docs[0].data() as InventoryLedgerEntry;
  }

  async listByProduct(productId: string, options?: { limit?: number }): Promise<InventoryLedgerEntry[]> {
    const q = query(
      collection(getUnifiedDb(), this.collectionName),
      where('productId', '==', productId),
      limit(options?.limit ?? 100),
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => d.data() as InventoryLedgerEntry);
  }
}
