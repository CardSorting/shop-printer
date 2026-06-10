import { adminDb, FieldValue, withAdminFirestoreRetry } from '@infrastructure/firebase/admin';
import type { AdminOperatorEvent } from '@core/admin/adminTypes';
import type { AdminMutationClaimResult, IAdminOperatorEventLog } from '@core/admin/adminOperatorEventLog';

const MUTATION_CLAIMS_COLLECTION = 'admin_mutation_claims';
const OPERATOR_EVENTS_COLLECTION = 'admin_operator_events';

export class FirestoreAdminOperatorEventLog implements IAdminOperatorEventLog {
  async claimMutation(idempotencyKey: string): Promise<AdminMutationClaimResult> {
    const ref = adminDb.collection(MUTATION_CLAIMS_COLLECTION).doc(idempotencyKey);
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
      { operationName: 'adminOperatorEventLog.claimMutation' },
    );
  }

  async markMutationCompleted(idempotencyKey: string): Promise<void> {
    const ref = adminDb.collection(MUTATION_CLAIMS_COLLECTION).doc(idempotencyKey);
    await withAdminFirestoreRetry(
      () => ref.set({
        key: idempotencyKey,
        status: 'completed',
        completedAt: FieldValue.serverTimestamp(),
      }, { merge: true }),
      { operationName: 'adminOperatorEventLog.markMutationCompleted' },
    );
  }

  async recordEvent(event: AdminOperatorEvent): Promise<void> {
    const ref = adminDb.collection(OPERATOR_EVENTS_COLLECTION).doc(event.id);
    await withAdminFirestoreRetry(
      () => ref.set({
        ...event,
        recordedAt: FieldValue.serverTimestamp(),
      }),
      { operationName: 'adminOperatorEventLog.recordEvent' },
    );
  }
}
