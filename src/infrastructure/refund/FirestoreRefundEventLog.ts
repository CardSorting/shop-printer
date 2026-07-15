import { adminDb, FieldValue, withAdminFirestoreRetry } from '@infrastructure/firebase/admin';
import type { IRefundEventLog, RefundExecutionClaimResult, RefundExecutionEvent } from '@core/refund/refundEventLog';

const CLAIMS_COLLECTION = 'refund_execution_claims';
const EVENTS_COLLECTION = 'refund_execution_events';

export class FirestoreRefundEventLog implements IRefundEventLog {
  async claimRefundExecution(idempotencyKey: string): Promise<RefundExecutionClaimResult> {
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
      { operationName: 'refundEventLog.claimRefundExecution' },
    ) as Promise<RefundExecutionClaimResult>;
  }

  async markRefundExecutionCompleted(idempotencyKey: string): Promise<void> {
    const ref = adminDb.collection(CLAIMS_COLLECTION).doc(idempotencyKey);
    await withAdminFirestoreRetry(
      () => ref.set({
        key: idempotencyKey,
        status: 'completed',
        completedAt: FieldValue.serverTimestamp(),
      }, { merge: true }),
      { operationName: 'refundEventLog.markRefundExecutionCompleted' },
    );
  }

  async markRefundExecutionFailed(idempotencyKey: string, error: string): Promise<void> {
    const ref = adminDb.collection(CLAIMS_COLLECTION).doc(idempotencyKey);
    await withAdminFirestoreRetry(
      () => ref.set({
        key: idempotencyKey,
        status: 'failed',
        error,
        failedAt: FieldValue.serverTimestamp(),
      }, { merge: true }),
      { operationName: 'refundEventLog.markRefundExecutionFailed' },
    );
  }

  async recordExecution(event: RefundExecutionEvent): Promise<void> {
    const ref = adminDb.collection(EVENTS_COLLECTION).doc(event.id);
    await withAdminFirestoreRetry(
      () => ref.set({
        ...event,
        recordedAt: FieldValue.serverTimestamp(),
      }),
      { operationName: 'refundEventLog.recordExecution' },
    );
  }

  async findByIdempotencyKey(idempotencyKey: string): Promise<RefundExecutionEvent | null> {
    const snap = await adminDb
      .collection(EVENTS_COLLECTION)
      .where('idempotencyKey', '==', idempotencyKey)
      .limit(1)
      .get();
    if (snap.empty) return null;
    return snap.docs[0].data() as RefundExecutionEvent;
  }
}
