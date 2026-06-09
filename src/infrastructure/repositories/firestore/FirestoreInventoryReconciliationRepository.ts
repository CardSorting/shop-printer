/**
 * [LAYER: INFRASTRUCTURE]
 */
import type { IInventoryReconciliationRepository } from '@domain/repositories';
import type { InventoryReconciliationCase } from '@domain/inventory';
import {
  collection,
  doc,
  setDoc,
  getUnifiedDb,
} from '../../firebase/bridge';
import * as crypto from 'node:crypto';

export class FirestoreInventoryReconciliationRepository implements IInventoryReconciliationRepository {
  private readonly collectionName = 'inventory_reconciliation_cases';

  async create(
    kase: Omit<InventoryReconciliationCase, 'id' | 'createdAt'>,
    transaction?: unknown,
  ): Promise<InventoryReconciliationCase> {
    const id = crypto.randomUUID();
    const record: InventoryReconciliationCase = {
      ...kase,
      id,
      createdAt: new Date().toISOString(),
    };
    const docRef = doc(getUnifiedDb(), this.collectionName, id);

    if (transaction) {
      (transaction as { set: (ref: unknown, data: unknown) => void }).set(docRef, record);
    } else {
      await setDoc(docRef, record);
    }
    return record;
  }
}
