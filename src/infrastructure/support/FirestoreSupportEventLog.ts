import { adminDb, FieldValue, withAdminFirestoreRetry } from '@infrastructure/firebase/admin';
import type { ISupportEventLog, SupportEvent, SupportMutationClaimResult } from '@core/support/supportEventLog';

const CLAIMS_COLLECTION = 'support_mutation_claims';
const EVENTS_COLLECTION = 'support_events';

export class FirestoreSupportEventLog implements ISupportEventLog {
  async claimMutation(idempotencyKey: string): Promise<SupportMutationClaimResult> {
    const ref = adminDb.collection(CLAIMS_COLLECTION).doc(idempotencyKey);
    return withAdminFirestoreRetry(
      () => adminDb.runTransaction(async (transaction: any) => {
        const snap = await transaction.get(ref);
        if (!snap.exists) {
          transaction.set(ref, {
            key: idempotencyKey,
            status: 'in_progress',
            claimedAt: FieldValue.serverTimestamp(),
          });
          return 'new';
        }
        const data = snap.data();
        if (data?.status === 'completed') return 'completed';
        return 'new';
      }),
      { operationName: 'supportEventLog.claimMutation' },
    );
  }

  async markMutationCompleted(idempotencyKey: string): Promise<void> {
    const ref = adminDb.collection(CLAIMS_COLLECTION).doc(idempotencyKey);
    await withAdminFirestoreRetry(
      () => ref.set({
        key: idempotencyKey,
        status: 'completed',
        completedAt: FieldValue.serverTimestamp(),
      }, { merge: true }),
      { operationName: 'supportEventLog.markMutationCompleted' },
    );
  }

  async recordEvent(event: SupportEvent): Promise<void> {
    const ref = adminDb.collection(EVENTS_COLLECTION).doc(event.id);
    await withAdminFirestoreRetry(
      () => ref.set({
        ...event,
        recordedAt: FieldValue.serverTimestamp(),
      }),
      { operationName: 'supportEventLog.recordEvent' },
    );
  }

  async findByIdempotencyKey(idempotencyKey: string): Promise<SupportEvent | null> {
    const snap = await adminDb
      .collection(EVENTS_COLLECTION)
      .where('idempotencyKey', '==', idempotencyKey)
      .limit(1)
      .get();
    if (snap.empty) return null;
    return snap.docs[0].data() as SupportEvent;
  }
}
