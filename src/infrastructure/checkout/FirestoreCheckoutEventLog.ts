import { adminDb, FieldValue, withAdminFirestoreRetry } from '@infrastructure/firebase/admin';
import type { CheckoutEventClaimResult, ICheckoutEventLog } from '@core/order/checkoutEventLog';

const RECOVERY_COLLECTION = 'checkout_recovery_attempts';
const OPERATOR_COLLECTION = 'operator_action_events';
const PROCESSING_LEASE_MS = 5 * 60 * 1000;

export class FirestoreCheckoutEventLog implements ICheckoutEventLog {
  async claimRecoveryAttempt(key: string): Promise<CheckoutEventClaimResult> {
    const ref = adminDb.collection(RECOVERY_COLLECTION).doc(key);
    return withAdminFirestoreRetry(
      () => adminDb.runTransaction(async (transaction: any) => {
        const snap = await transaction.get(ref);
        const now = Date.now();
        if (!snap.exists) {
          transaction.set(ref, {
            key,
            status: 'in_progress',
            claimedAt: FieldValue.serverTimestamp(),
            claimExpiresAt: now + PROCESSING_LEASE_MS,
          });
          return 'new';
        }
        const data = snap.data();
        if (data?.status === 'completed') return 'completed';
        if (data?.status === 'in_progress' && data.claimExpiresAt && data.claimExpiresAt > now) {
          return 'in_progress';
        }
        transaction.set(ref, {
          key,
          status: 'in_progress',
          reclaimedAt: FieldValue.serverTimestamp(),
          claimExpiresAt: now + PROCESSING_LEASE_MS,
        }, { merge: true });
        return 'new';
      }),
      { operationName: 'checkoutEventLog.claimRecoveryAttempt' },
    );
  }

  async markRecoveryAttemptCompleted(key: string): Promise<void> {
    const ref = adminDb.collection(RECOVERY_COLLECTION).doc(key);
    await withAdminFirestoreRetry(
      () => ref.set({
        key,
        status: 'completed',
        completedAt: FieldValue.serverTimestamp(),
        claimExpiresAt: null,
      }, { merge: true }),
      { operationName: 'checkoutEventLog.markRecoveryAttemptCompleted' },
    );
  }

  async markRecoveryAttemptFailed(key: string, error: string): Promise<void> {
    const ref = adminDb.collection(RECOVERY_COLLECTION).doc(key);
    await withAdminFirestoreRetry(
      () => ref.set({
        key,
        status: 'failed',
        error,
        failedAt: FieldValue.serverTimestamp(),
        claimExpiresAt: null,
      }, { merge: true }),
      { operationName: 'checkoutEventLog.markRecoveryAttemptFailed' },
    );
  }

  async claimOperatorAction(key: string): Promise<'new' | 'completed'> {
    const ref = adminDb.collection(OPERATOR_COLLECTION).doc(key);
    return withAdminFirestoreRetry(
      () => adminDb.runTransaction(async (transaction: any) => {
        const snap = await transaction.get(ref);
        if (!snap.exists) {
          transaction.set(ref, {
            key,
            status: 'in_progress',
            recordedAt: FieldValue.serverTimestamp(),
          });
          return 'new';
        }
        const data = snap.data();
        if (data?.status === 'completed') return 'completed';
        return 'new';
      }),
      { operationName: 'checkoutEventLog.claimOperatorAction' },
    );
  }

  async markOperatorActionCompleted(key: string): Promise<void> {
    const ref = adminDb.collection(OPERATOR_COLLECTION).doc(key);
    await withAdminFirestoreRetry(
      () => ref.set({
        key,
        status: 'completed',
        completedAt: FieldValue.serverTimestamp(),
      }, { merge: true }),
      { operationName: 'checkoutEventLog.markOperatorActionCompleted' },
    );
  }
}
