/**
 * [LAYER: INFRASTRUCTURE]
 * Industrialized Stripe Service for End-to-End Payment Flows.
 * Firestore Implementation for event tracking.
 */
import Stripe from 'stripe';
import crypto from 'node:crypto';
import { PaymentFailedError } from '@domain/errors';
import { logger } from '@utils/logger';
import { adminDb, FieldValue, withAdminFirestoreRetry } from '@infrastructure/firebase/admin';

export class StripeService {
  private stripe: Stripe;
  private readonly collectionName = 'stripe_webhook_events';
  private readonly processingLeaseMs = 5 * 60 * 1000;

  constructor() {
    const secretKey = process.env.STRIPE_SECRET_KEY?.trim();
    if (!secretKey) {
      logger.warn('STRIPE_SECRET_KEY is missing. Stripe integration will be disabled.');
    }
    this.stripe = new Stripe(secretKey || '', {
      apiVersion: '2025-02-11-preview' as any,
      typescript: true,
    });
  }

  /**
   * Creates a Payment Intent for the checkout flow.
   */
  async createPaymentIntent(params: {
    amount: number;
    currency: string;
    orderId?: string;
    userId: string;
    metadata?: Record<string, string>;
    idempotencyKey?: string;
  }): Promise<{ clientSecret: string; id: string }> {
    if (!process.env.STRIPE_SECRET_KEY?.trim()) {
      throw new PaymentFailedError('Stripe is not configured. Set STRIPE_SECRET_KEY.');
    }

    try {
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: params.amount,
        currency: params.currency,
        metadata: {
          ...params.metadata,
          userId: params.userId,
          orderId: params.orderId || '',
        },
        automatic_payment_methods: {
          enabled: true,
        },
      }, {
        idempotencyKey: params.idempotencyKey,
      });

      if (!paymentIntent.client_secret) {
        throw new PaymentFailedError('Failed to generate Stripe client secret.');
      }

      return {
        clientSecret: paymentIntent.client_secret,
        id: paymentIntent.id,
      };
    } catch (error) {
      logger.error('Stripe PaymentIntent creation failed', error);
      throw new PaymentFailedError(error instanceof Error ? error.message : 'Stripe communication error');
    }
  }

  /**
   * Verifies a webhook signature and returns the event.
   */
  constructEvent(payload: string | Buffer, signature: string): Stripe.Event {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
    if (!webhookSecret) {
      throw new Error('STRIPE_WEBHOOK_SECRET is not configured.');
    }

    try {
      return this.stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    } catch (err) {
      logger.error('Stripe webhook signature verification failed', err);
      throw new Error(`Webhook Error: ${err instanceof Error ? err.message : 'Unknown'}`);
    }
  }

  /**
   * Atomic event claim. Returns true if the event should be SKIPPED (already completed or in-progress).
   * Returns false if the event is new or was previously failed (allowing Stripe retries).
   *
   * Event lifecycle: processing → completed | failed
   * - 'processing': Claimed by this invocation, proceed with handling.
   * - 'completed': Previously finalized successfully, skip.
   * - 'failed': Previous attempt failed, allow retry.
   */
  async tryProcessEvent(eventId: string, type: string): Promise<{ alreadyProcessed: boolean; claimToken: string | null }> {
    const eventRef = adminDb.collection(this.collectionName).doc(eventId);

    return await withAdminFirestoreRetry(
      () => adminDb.runTransaction(async (transaction: any) => {
        const docSnap = await transaction.get(eventRef);
        const now = Date.now();
        const claimToken = crypto.randomUUID();
        if (docSnap.exists) {
          const data = docSnap.data();
          // Allow retry of failed events — Stripe will resend on 500
          if (data?.status === 'failed') {
            logger.info(`Retrying previously failed webhook event ${eventId}`, { previousReason: data.failReason });
            transaction.update(eventRef, {
              status: 'processing',
              claimToken,
              retriedAt: FieldValue.serverTimestamp(),
              claimExpiresAt: now + this.processingLeaseMs,
            });
            return { alreadyProcessed: false, claimToken }; // Re-attempt allowed
          }
          if (data?.status === 'processing' && (!data.claimExpiresAt || data.claimExpiresAt <= now)) {
            logger.warn(`Reclaiming stale webhook event ${eventId}`, {
              type,
              previousClaimExpiresAt: data.claimExpiresAt,
            });
            transaction.update(eventRef, {
              status: 'processing',
              claimToken,
              reclaimedAt: FieldValue.serverTimestamp(),
              claimExpiresAt: now + this.processingLeaseMs,
            });
            return { alreadyProcessed: false, claimToken };
          }
          return { alreadyProcessed: true, claimToken: null }; // 'processing' or 'completed' — skip
        }

        transaction.set(eventRef, {
          id: eventId,
          type,
          status: 'processing',
          claimToken,
          claimedAt: FieldValue.serverTimestamp(),
          claimExpiresAt: now + this.processingLeaseMs,
        });
        return { alreadyProcessed: false, claimToken }; // New event, now claimed
      }),
      { operationName: 'stripe.tryProcessEvent' }
    );
  }

  /**
   * Checks if a webhook event has already been processed.
   */
  async isEventProcessed(eventId: string): Promise<boolean> {
    const docSnap: any = await withAdminFirestoreRetry(
      () => adminDb.collection(this.collectionName).doc(eventId).get(),
      { operationName: 'stripe.isEventProcessed' }
    );
    return docSnap.exists;
  }

  async getEventStatus(eventId: string): Promise<'processing' | 'completed' | 'failed' | null> {
    const docSnap: any = await withAdminFirestoreRetry(
      () => adminDb.collection(this.collectionName).doc(eventId).get(),
      { operationName: 'stripe.getEventStatus' }
    );
    if (!docSnap.exists) return null;
    const status = docSnap.data()?.status;
    return status === 'processing' || status === 'completed' || status === 'failed' ? status : null;
  }

  async listStuckWebhookClaims(limit = 50): Promise<Array<{
    id: string;
    type?: string | null;
    status: 'processing';
    claimToken?: string | null;
    claimExpiresAt?: number | null;
    claimedAt?: unknown;
    updatedAt?: unknown;
  }>> {
    const now = Date.now();
    const snapshot: any = await withAdminFirestoreRetry(
      () => adminDb.collection(this.collectionName)
        .where('status', '==', 'processing')
        .where('claimExpiresAt', '<=', now)
        .limit(limit)
        .get(),
      { operationName: 'stripe.listStuckWebhookClaims' }
    );

    return snapshot.docs.map((docSnap: any) => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        type: data?.type || null,
        status: 'processing',
        claimToken: data?.claimToken || null,
        claimExpiresAt: data?.claimExpiresAt || null,
        claimedAt: data?.claimedAt || null,
        updatedAt: data?.updatedAt || null,
      };
    });
  }

  /**
   * Marks a webhook event as successfully completed. Permanently blocks future retries.
   */
  async markEventProcessed(eventId: string, type: string, claimToken?: string | null): Promise<void> {
    await withAdminFirestoreRetry(
      () => adminDb.runTransaction(async (transaction: any) => {
        const ref = adminDb.collection(this.collectionName).doc(eventId);
        const snap = await transaction.get(ref);
        const data = snap.exists ? snap.data() : null;
        if (claimToken && data?.claimToken !== claimToken) {
          logger.warn(`Skipping stale webhook completion for ${eventId}: claim token mismatch.`);
          return;
        }

        transaction.set(ref, {
          id: eventId,
          type,
          status: 'completed',
          claimToken: null,
          claimExpiresAt: null,
          processedAt: FieldValue.serverTimestamp(),
        }, { merge: true });
      }),
      { operationName: 'stripe.markEventProcessed' }
    );
  }

  /**
   * Marks a webhook event as failed, allowing Stripe retries to re-attempt processing.
   * This replaces the old deleteEvent approach to prevent replay-on-partial-mutation.
   */
  async markEventFailed(eventId: string, reason: string, claimToken?: string | null): Promise<void> {
    await withAdminFirestoreRetry(
      () => adminDb.runTransaction(async (transaction: any) => {
        const ref = adminDb.collection(this.collectionName).doc(eventId);
        const snap = await transaction.get(ref);
        const data = snap.exists ? snap.data() : null;
        if (data?.status === 'completed') {
          logger.warn(`Skipping stale webhook failure for ${eventId}: event is already completed.`);
          return;
        }
        if (claimToken && data?.claimToken !== claimToken) {
          logger.warn(`Skipping stale webhook failure for ${eventId}: claim token mismatch.`);
          return;
        }

        transaction.set(ref, {
          id: eventId,
          status: 'failed',
          claimToken: null,
          claimExpiresAt: null,
          failReason: reason,
          failedAt: FieldValue.serverTimestamp(),
        }, { merge: true });
      }),
      { operationName: 'stripe.markEventFailed' }
    );
  }

  /**
   * @deprecated Use markEventFailed instead. Retained for backward compatibility.
   */
  async deleteEvent(eventId: string): Promise<void> {
    await withAdminFirestoreRetry(
      () => adminDb.collection(this.collectionName).doc(eventId).delete(),
      { operationName: 'stripe.deleteEvent' }
    );
  }

  /**
   * Retrieves a Payment Intent by ID.
   */
  async getPaymentIntent(id: string): Promise<Stripe.PaymentIntent> {
    return this.stripe.paymentIntents.retrieve(id);
  }

  async cancelPaymentIntent(id: string): Promise<Stripe.PaymentIntent> {
    if (!process.env.STRIPE_SECRET_KEY?.trim()) {
      throw new PaymentFailedError('Stripe is not configured. Set STRIPE_SECRET_KEY.');
    }
    return this.stripe.paymentIntents.cancel(id);
  }
}
