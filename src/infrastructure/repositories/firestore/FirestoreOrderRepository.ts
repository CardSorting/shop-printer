/**
 * [LAYER: INFRASTRUCTURE]
 * Firestore Implementation of Order Repository
 */
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  query, 
  where, 
  orderBy,
  limit,
  startAfter, 
  Timestamp,
  writeBatch,
  getUnifiedDb,
  runTransaction,
  serverTimestamp,
  arrayUnion,
  increment,
  getCount,
  type DocumentData,
  type QueryDocumentSnapshot
} from '../../firebase/bridge';
import { logger } from '@utils/logger';
import type { IOrderRepository } from '@domain/repositories';
import type {
  Address,
  CheckoutAuthoritySource,
  CheckoutAttempt,
  CheckoutAttemptState,
  CheckoutPhase,
  CheckoutTransitionEvidence,
  CheckoutWaitingFor,
  CheckoutWorkflowPhase,
  Order,
  OrderItem,
  OrderStatus,
  OrderStats,
  PaymentReconciliationFailureClassification,
  PaymentState,
  FulfillmentState,
  ReconciliationState,
  PaymentReconciliationCase,
  PaymentReconciliationCaseLifecycleState,
  PaymentReconciliationReason,
} from '@domain/models';
import {
  assertLegalCheckoutOperationalPhaseTransition,
  assertLegalCheckoutPhaseTransition,
  mapWorkflowPhaseToCheckoutPhase,
} from '@core/order/checkoutWorkflow';


import { mapDoc, mapTimestamp } from './utils';

export class FirestoreOrderRepository implements IOrderRepository {
  private readonly collectionName = 'orders';
  private readonly statsDocPath = 'system_state/order_stats';
  private readonly checkoutAttemptCollectionName = 'checkout_attempts';
  private readonly userCheckoutStateCollectionName = 'user_checkout_state';
  private readonly reconciliationCaseCollectionName = 'payment_reconciliation_cases';


  private mapDocToOrder(id: string, data: DocumentData): Order {
    return mapDoc<Order>(id, data);
  }

  private mapDocToCheckoutAttempt(id: string, data: DocumentData): CheckoutAttempt {
    return mapDoc<CheckoutAttempt>(id, data);
  }

  private mapDocToReconciliationCase(id: string, data: DocumentData): PaymentReconciliationCase {
    return mapDoc<PaymentReconciliationCase>(id, data);
  }

  private derivePaymentState(data: DocumentData): PaymentState {
    if (data.paymentState) return data.paymentState as PaymentState;
    if (data.status === 'refunded') return 'refunded';
    if (data.status === 'partially_refunded') return 'partially_refunded';
    if (data.status === 'cancelled') return 'cancelled';
    if (['confirmed', 'processing', 'shipped', 'delivered', 'ready_for_pickup', 'delivery_started'].includes(data.status)) return 'paid';
    return 'unpaid';
  }

  private deriveFulfillmentState(data: DocumentData): FulfillmentState {
    if (data.fulfillmentState) return data.fulfillmentState as FulfillmentState;
    if (data.status === 'processing') return 'processing';
    if (data.status === 'ready_for_pickup') return 'ready_for_pickup';
    if (data.status === 'delivery_started') return 'delivery_started';
    if (data.status === 'shipped') return 'shipped';
    if (data.status === 'delivered') return 'delivered';
    if (data.status === 'cancelled') return 'cancelled';
    return 'unfulfilled';
  }

  private deriveReconciliationState(data: DocumentData): ReconciliationState {
    if (data.reconciliationState) return data.reconciliationState as ReconciliationState;
    if (data.reconciliationRequired || data.status === 'reconciling') return 'needs_review';
    return 'none';
  }

  private normalizeReconciliationClassification(
    classification?: PaymentReconciliationFailureClassification | 'transient' | 'terminal' | null,
    reason?: PaymentReconciliationReason
  ): PaymentReconciliationFailureClassification {
    if (classification === 'transient') return 'transient_external';
    if (classification === 'terminal') return 'operator_required';
    if (classification) return classification;
    if (reason === 'finalization_failure') return 'local_persistence_failure';
    if (reason === 'paid_not_finalized') return 'local_persistence_failure';
    if (reason === 'mapping_mismatch' || reason === 'dangling_payment_intent') return 'stripe_local_mismatch';
    if (reason === 'paid_cancelled' || reason === 'fencing_token_mismatch') return 'operator_required';
    return 'operator_required';
  }

  async create(order: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>, transaction?: any): Promise<Order> {
    const db = getUnifiedDb();
    const operation = async (t: any) => {
      // 1. Strict Idempotency Check (Transactional Point-Read)
      if (order.idempotencyKey) {
        const idempRef = doc(db, 'order_idempotency_keys', order.idempotencyKey);
        const idempSnap = await t.get(idempRef);
        
        if (idempSnap.exists()) {
          const { orderId } = idempSnap.data();
          // Production Hardening: Use transactional point-read instead of non-transactional getById
          // to maintain ACID guarantees within the idempotency check.
          const existingRef = doc(db, this.collectionName, orderId);
          const existingSnap = await t.get(existingRef);
          if (existingSnap.exists()) {
            logger.info('Duplicate order detected via atomic idempotency check', { key: order.idempotencyKey, orderId });
            return this.mapDocToOrder(existingSnap.id, existingSnap.data());
          }
        }
      }

      // 2. Generate Identity and Timestamps
      const id = crypto.randomUUID();
      const now = new Date();

      const orderData = {
        ...order,
        paymentState: order.paymentState || this.derivePaymentState(order),
        fulfillmentState: order.fulfillmentState || this.deriveFulfillmentState(order),
        reconciliationState: order.reconciliationState || this.deriveReconciliationState(order),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        riskScore: await this.calculateRiskScore(order),
      };

      // 3. Commit Atomic Block
      const docRef = doc(db, this.collectionName, id);
      t.set(docRef, orderData);

      if (order.idempotencyKey) {
        const idempRef = doc(db, 'order_idempotency_keys', order.idempotencyKey);
        t.set(idempRef, { orderId: id, createdAt: serverTimestamp() });
      }

      if (order.paymentTransactionId) {
        const payRef = doc(db, 'order_payment_intent_map', order.paymentTransactionId);
        t.set(payRef, { orderId: id, createdAt: serverTimestamp() });
      }

      // 4. Update Sovereign Stats (Atomic)
      this.applyOrderStatsDeltas(t, {
        revenueDelta: order.total,
        orderDelta: 1,
        statusChanges: [{ to: order.status }]
      });


      return {
        ...order,
        id,
        customerNote: order.customerNote || null,
        createdAt: now,
        updatedAt: now,
        riskScore: orderData.riskScore,
        paymentState: orderData.paymentState,
        fulfillmentState: orderData.fulfillmentState,
        reconciliationState: orderData.reconciliationState,
      } as Order;
    };

    if (transaction) {
      return await operation(transaction);
    } else {
      return await runTransaction(db, operation);
    }
  }

  async getById(id: string, transaction?: any): Promise<Order | null> {
    const docRef = doc(getUnifiedDb(), this.collectionName, id);
    if (transaction) {
      const snap = await transaction.get(docRef);
      if (!snap.exists()) return null;
      return this.mapDocToOrder(snap.id, snap.data());
    } else {
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) return null;
      return this.mapDocToOrder(docSnap.id, docSnap.data());
    }
  }

  async save(order: Order, transaction?: any): Promise<void> {
    const { id, ...data } = order;
    const docRef = doc(getUnifiedDb(), this.collectionName, id);
    const updateData = {
      ...data,
      updatedAt: serverTimestamp(),
    };

    if (transaction) {
      transaction.set(docRef, updateData);
    } else {
      await setDoc(docRef, updateData);
    }
  }

  async update(id: string, updates: Partial<Omit<Order, 'id' | 'createdAt'>>, transaction?: any): Promise<Order> {
    const db = getUnifiedDb();
    const docRef = doc(db, this.collectionName, id);

    const operation = async (t: any) => {
      const snap = await t.get(docRef);
      if (!snap.exists()) {
        throw new Error(`Order ${id} not found`);
      }

      const existing = this.mapDocToOrder(snap.id, snap.data());
      const payload = {
        ...updates,
        updatedAt: serverTimestamp()
      };

      t.update(docRef, payload);
      
      // If status is changed, update stats (Atomic)
      if (updates.status && updates.status !== existing.status) {
        this.applyOrderStatsDeltas(t, {
          statusChanges: [{ from: existing.status, to: updates.status }]
        });
      }

      return {
        ...existing,
        ...updates,
        updatedAt: new Date()
      } as Order;
    };

    if (transaction) {
      return await operation(transaction);
    } else {
      return await runTransaction(db, operation);
    }
  }

  async getByIdempotencyKey(key: string): Promise<Order | null> {
    const q = query(collection(getUnifiedDb(), this.collectionName), where('idempotencyKey', '==', key), limit(1));
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    return this.mapDocToOrder(snapshot.docs[0].id, snapshot.docs[0].data());
  }

  async getByPaymentTransactionId(id: string): Promise<Order | null> {
    const q = query(collection(getUnifiedDb(), this.collectionName), where('paymentTransactionId', '==', id), limit(1));
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    return this.mapDocToOrder(snapshot.docs[0].id, snapshot.docs[0].data());
  }

  async getByPaymentTransactionIdTransactional(id: string, transaction: any): Promise<Order | null> {
    const mapRef = doc(getUnifiedDb(), 'order_payment_intent_map', id);
    const mapSnap = await transaction.get(mapRef);
    
    if (!mapSnap.exists()) return null;
    
    const { orderId } = mapSnap.data();
    const orderRef = doc(getUnifiedDb(), this.collectionName, orderId);
    const orderSnap = await transaction.get(orderRef);
    
    if (!orderSnap.exists()) return null;
    return this.mapDocToOrder(orderSnap.id, orderSnap.data());
  }

  async getByUserId(userId: string, options?: {
    status?: OrderStatus | 'all';
    limit?: number;
    cursor?: string;
    from?: Date;
    to?: Date;
  }): Promise<{ orders: Order[]; nextCursor?: string }> {
    let q = query(
      collection(getUnifiedDb(), this.collectionName), 
      where('userId', '==', userId), 
      orderBy('createdAt', 'desc')
    );

    if (options?.status && options.status !== 'all') {
      q = query(q, where('status', '==', options.status));
    }

    if (options?.from) {
      q = query(q, where('createdAt', '>=', Timestamp.fromDate(options.from)));
    }

    if (options?.to) {
      q = query(q, where('createdAt', '<=', Timestamp.fromDate(options.to)));
    }

    const limitVal = options?.limit ?? 20;
    q = query(q, limit(limitVal + 1));

    if (options?.cursor) {
      const cursorDoc = await getDoc(doc(getUnifiedDb(), this.collectionName, options.cursor));
      if (cursorDoc.exists()) {
        q = query(q, startAfter(cursorDoc));
      }
    }

    const snapshot = await getDocs(q);
    const results = snapshot.docs.map((d: QueryDocumentSnapshot) => this.mapDocToOrder(d.id, d.data() as any));
    
    const hasNextPage = results.length > limitVal;
    const orders = results.slice(0, limitVal);
    const nextCursor = hasNextPage ? orders[orders.length - 1].id : undefined;

    return { orders, nextCursor };
  }

  async getAll(options?: {
    status?: OrderStatus;
    query?: string;
    limit?: number;
    cursor?: string;
    from?: Date;
    to?: Date;
  }): Promise<{ orders: Order[]; nextCursor?: string }> {
    let q = query(collection(getUnifiedDb(), this.collectionName), orderBy('createdAt', 'desc'));

    if (options?.status) {
      q = query(q, where('status', '==', options.status));
    }

    if (options?.from) {
      q = query(q, where('createdAt', '>=', Timestamp.fromDate(options.from)));
    }

    if (options?.to) {
      q = query(q, where('createdAt', '<=', Timestamp.fromDate(options.to)));
    }

    const limitVal = options?.limit ?? 20;
    q = query(q, limit(limitVal + 1));

    if (options?.cursor) {
      const cursorDoc = await getDoc(doc(getUnifiedDb(), this.collectionName, options.cursor));
      if (cursorDoc.exists()) {
        q = query(q, startAfter(cursorDoc));
      }
    }

    const snapshot = await getDocs(q);
    const results = snapshot.docs.map((d: QueryDocumentSnapshot) => this.mapDocToOrder(d.id, d.data() as any));
    
    const hasNextPage = results.length > limitVal;
    const orders = results.slice(0, limitVal);
    const nextCursor = hasNextPage ? orders[orders.length - 1].id : undefined;

    return { orders, nextCursor };
  }

  async updateStatus(id: string, status: OrderStatus, transaction?: any): Promise<void> {
    const paymentSensitiveStatuses: OrderStatus[] = [
      'pending',
      'confirmed',
      'processing',
      'ready_for_pickup',
      'delivery_started',
      'shipped',
      'delivered',
      'cancelled',
      'refunded',
      'partially_refunded',
      'reconciling',
    ];
    if (paymentSensitiveStatuses.includes(status)) {
      throw new Error(`Direct order status write rejected for payment-sensitive status ${status}. Use guarded state transition helpers.`);
    }

    const db = getUnifiedDb();
    const docRef = doc(db, this.collectionName, id);

    if (transaction) {
      transaction.update(docRef, {
        status,
        updatedAt: serverTimestamp()
      });
      return;
    }
    
    const operation = async (t: any) => {
      const snap = await t.get(docRef);
      if (!snap.exists()) return;
      const oldStatus = snap.data().status as OrderStatus;
      
      t.update(docRef, { 
        status, 
        updatedAt: serverTimestamp() 
      });

      if (oldStatus !== status) {
        this.applyOrderStatsDeltas(t, {
          statusChanges: [{ from: oldStatus, to: status }]
        });
      }
    };

    if (transaction) {
      await operation(transaction);
    } else {
      await runTransaction(db, operation);
    }
  }

  async guardedUpdateStatus(
    id: string,
    allowedCurrentStatuses: OrderStatus[],
    status: OrderStatus,
    reason: string,
    transaction?: any
  ): Promise<void> {
    const db = getUnifiedDb();
    const docRef = doc(db, this.collectionName, id);

    if (transaction) {
      transaction.update(docRef, {
        status,
        updatedAt: serverTimestamp(),
        [`metadata.guardedStatusTransitions.${Date.now()}`]: {
          allowedCurrentStatuses,
          to: status,
          reason,
          transactionGuardedByCaller: true,
        },
      });
      return;
    }

    const operation = async (t: any) => {
      const snap = await t.get(docRef);
      if (!snap.exists()) {
        throw new Error(`Order ${id} not found`);
      }

      const oldStatus = snap.data().status as OrderStatus;
      if (!allowedCurrentStatuses.includes(oldStatus)) {
        throw new Error(`Guarded order transition rejected for ${id}: ${oldStatus} -> ${status} (${reason})`);
      }

      t.update(docRef, {
        status,
        updatedAt: serverTimestamp()
      });

      if (oldStatus !== status) {
        this.applyOrderStatsDeltas(t, {
          statusChanges: [{ from: oldStatus, to: status }]
        });
      }
    };

    if (transaction) {
      await operation(transaction);
    } else {
      await runTransaction(db, operation);
    }
  }

  private assertMonotonicPaymentState(current: PaymentState, next: PaymentState, reason: string): void {
    const rank: Record<PaymentState, number> = {
      unpaid: 0,
      requires_payment_method: 1,
      processing: 2,
      failed: 3,
      cancelled: 3,
      paid: 4,
      partially_refunded: 5,
      refunded: 6,
    };

    if (current === next) return;
    if ((current === 'paid' || current === 'partially_refunded' || current === 'refunded') && ['unpaid', 'requires_payment_method', 'processing', 'failed', 'cancelled'].includes(next)) {
      throw new Error(`Payment state regression rejected: ${current} -> ${next} (${reason})`);
    }
    if (rank[next] < rank[current] && !(current === 'failed' && next === 'requires_payment_method')) {
      throw new Error(`Payment state regression rejected: ${current} -> ${next} (${reason})`);
    }
  }

  async transitionPaymentState(
    id: string,
    allowedCurrentStates: PaymentState[],
    nextState: PaymentState,
    reason: string,
    transaction?: any
  ): Promise<void> {
    const db = getUnifiedDb();
    const docRef = doc(db, this.collectionName, id);

    if (transaction) {
      transaction.update(docRef, {
        paymentState: nextState,
        [`metadata.paymentStateTransitions.${Date.now()}`]: {
          allowedCurrentStates,
          to: nextState,
          reason,
          transactionGuardedByCaller: true,
        },
        updatedAt: serverTimestamp(),
      });
      return;
    }

    const operation = async (t: any) => {
      const snap = await t.get(docRef);
      if (!snap.exists()) throw new Error(`Order ${id} not found`);
      const data = snap.data();
      const current = this.derivePaymentState(data);
      if (!allowedCurrentStates.includes(current)) {
        throw new Error(`Payment state transition rejected for ${id}: ${current} -> ${nextState} (${reason})`);
      }
      this.assertMonotonicPaymentState(current, nextState, reason);
      t.update(docRef, {
        paymentState: nextState,
        [`metadata.paymentStateTransitions.${Date.now()}`]: { from: current, to: nextState, reason },
        updatedAt: serverTimestamp(),
      });
    };

    if (transaction) await operation(transaction);
    else await runTransaction(db, operation);
  }

  async transitionFulfillmentState(
    id: string,
    allowedCurrentStates: FulfillmentState[],
    nextState: FulfillmentState,
    reason: string,
    transaction?: any
  ): Promise<void> {
    const db = getUnifiedDb();
    const docRef = doc(db, this.collectionName, id);

    if (transaction) {
      transaction.update(docRef, {
        fulfillmentState: nextState,
        [`metadata.fulfillmentStateTransitions.${Date.now()}`]: {
          allowedCurrentStates,
          to: nextState,
          reason,
          transactionGuardedByCaller: true,
        },
        updatedAt: serverTimestamp(),
      });
      return;
    }

    const operation = async (t: any) => {
      const snap = await t.get(docRef);
      if (!snap.exists()) throw new Error(`Order ${id} not found`);
      const current = this.deriveFulfillmentState(snap.data());
      if (!allowedCurrentStates.includes(current)) {
        throw new Error(`Fulfillment state transition rejected for ${id}: ${current} -> ${nextState} (${reason})`);
      }
      t.update(docRef, {
        fulfillmentState: nextState,
        [`metadata.fulfillmentStateTransitions.${Date.now()}`]: { from: current, to: nextState, reason },
        updatedAt: serverTimestamp(),
      });
    };

    if (transaction) await operation(transaction);
    else await runTransaction(db, operation);
  }

  async transitionReconciliationState(
    id: string,
    allowedCurrentStates: ReconciliationState[],
    nextState: ReconciliationState,
    reason: string,
    transaction?: any
  ): Promise<void> {
    const db = getUnifiedDb();
    const docRef = doc(db, this.collectionName, id);

    if (transaction) {
      transaction.update(docRef, {
        reconciliationState: nextState,
        reconciliationRequired: nextState === 'needs_review' || nextState === 'in_progress',
        [`metadata.reconciliationStateTransitions.${Date.now()}`]: {
          allowedCurrentStates,
          to: nextState,
          reason,
          transactionGuardedByCaller: true,
        },
        updatedAt: serverTimestamp(),
      });
      return;
    }

    const operation = async (t: any) => {
      const snap = await t.get(docRef);
      if (!snap.exists()) throw new Error(`Order ${id} not found`);
      const current = this.deriveReconciliationState(snap.data());
      if (!allowedCurrentStates.includes(current)) {
        throw new Error(`Reconciliation state transition rejected for ${id}: ${current} -> ${nextState} (${reason})`);
      }
      t.update(docRef, {
        reconciliationState: nextState,
        reconciliationRequired: nextState === 'needs_review' || nextState === 'in_progress',
        [`metadata.reconciliationStateTransitions.${Date.now()}`]: { from: current, to: nextState, reason },
        updatedAt: serverTimestamp(),
      });
    };

    if (transaction) await operation(transaction);
    else await runTransaction(db, operation);
  }

  async batchUpdateStatus(ids: string[], status: OrderStatus): Promise<void> {
    const db = getUnifiedDb();
    await runTransaction(db, async (t: any) => {
      const statusChanges: { from: OrderStatus; to: OrderStatus }[] = [];
      
      for (const id of ids) {
        const docRef = doc(db, this.collectionName, id);
        const snap = await t.get(docRef);
        if (snap.exists()) {
          const oldStatus = snap.data().status as OrderStatus;
          if (oldStatus !== status) {
            t.update(docRef, { status, updatedAt: serverTimestamp() });
            statusChanges.push({ from: oldStatus, to: status });
          }
        }
      }

      if (statusChanges.length > 0) {
        this.applyOrderStatsDeltas(t, { statusChanges });
      }
    });
  }


  async updatePaymentTransactionId(id: string, paymentTransactionId: string, transaction?: any): Promise<void> {
    const db = getUnifiedDb();
    // Production Hardening: Atomically update both the order doc AND the PI→Order lookup map.
    // Without the map write, finalizeOrderPayment (called by webhook) cannot resolve the order
    // via getByPaymentTransactionIdTransactional.
    const operation = async (t: any) => {
      const orderRef = doc(db, this.collectionName, id);
      const orderSnap = await t.get(orderRef);
      if (!orderSnap.exists()) {
        throw new Error(`Order ${id} not found`);
      }

      const existingOrderTx = orderSnap.data().paymentTransactionId;
      if (existingOrderTx && existingOrderTx !== paymentTransactionId) {
        throw new Error(`Order ${id} is already linked to payment transaction ${existingOrderTx}`);
      }

      const mapRef = doc(db, 'order_payment_intent_map', paymentTransactionId);
      const mapSnap = await t.get(mapRef);
      if (mapSnap.exists()) {
        const { orderId } = mapSnap.data();
        if (orderId !== id) {
          throw new Error(`Payment transaction ${paymentTransactionId} is already linked to order ${orderId}`);
        }
      }

      t.update(orderRef, { 
        paymentTransactionId, 
        updatedAt: serverTimestamp() 
      });
      t.set(mapRef, { orderId: id, createdAt: serverTimestamp() });
    };

    if (transaction) {
      await operation(transaction);
    } else {
      await runTransaction(db, operation);
    }
  }

  async recordCheckoutAttempt(attempt: Omit<CheckoutAttempt, 'createdAt' | 'updatedAt'>, transaction?: any): Promise<void> {
    const db = getUnifiedDb();
    const operation = async (t: any) => {
      const attemptRef = doc(db, this.checkoutAttemptCollectionName, attempt.idempotencyKey);
      const userStateRef = doc(db, this.userCheckoutStateCollectionName, attempt.userId);
      const data = {
        ...attempt,
        id: attempt.idempotencyKey,
        cartOwner: attempt.cartOwner || attempt.cartOwnerId || attempt.userId,
        currentPhase: attempt.currentPhase || 'CREATE_OR_RESUME_ATTEMPT',
        authoritySource: attempt.authoritySource || 'local',
        waitingFor: attempt.waitingFor || 'none',
        lastTransitionAt: attempt.lastTransitionAt || new Date().toISOString(),
        lastTransitionReason: attempt.lastTransitionReason || 'checkout_attempt_recorded',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      t.set(attemptRef, data, { merge: true });
      t.set(userStateRef, {
        userId: attempt.userId,
        latestAttemptId: attempt.idempotencyKey,
        orderId: attempt.orderId,
        cartOwnerId: attempt.cartOwnerId,
        fencingToken: attempt.fencingToken,
        updatedAt: serverTimestamp(),
      }, { merge: true });
    };

    if (transaction) await operation(transaction);
    else await runTransaction(db, operation);
  }

  async updateCheckoutAttempt(
    idempotencyKey: string,
    updates: Partial<Omit<CheckoutAttempt, 'id' | 'createdAt' | 'updatedAt' | 'currentPhase' | 'checkoutPhase' | 'authoritySource' | 'waitingFor'>>,
    transaction?: any
  ): Promise<void> {
    const forbiddenKeys: (keyof CheckoutAttempt)[] = ['currentPhase', 'checkoutPhase', 'authoritySource', 'waitingFor'];
    for (const key of forbiddenKeys) {
      if (key in updates) {
        throw new Error(`Direct update of state-machine property '${key}' via updateCheckoutAttempt is prohibited. Use transitionCheckoutAttemptPhase instead.`);
      }
    }

    const db = getUnifiedDb();
    if (transaction) {
      const attemptRef = doc(db, this.checkoutAttemptCollectionName, idempotencyKey);
      transaction.set(attemptRef, {
        ...updates,
        updatedAt: serverTimestamp(),
      }, { merge: true });
      return;
    }

    const operation = async (t: any) => {
      const attemptRef = doc(db, this.checkoutAttemptCollectionName, idempotencyKey);
      const attemptSnap = await t.get(attemptRef);
      if (!attemptSnap.exists()) {
        throw new Error(`Checkout attempt ${idempotencyKey} not found`);
      }

      t.update(attemptRef, {
        ...updates,
        updatedAt: serverTimestamp(),
      });

      if (updates.userId || updates.orderId || updates.cartOwnerId || updates.fencingToken) {
        const data = attemptSnap.data();
        const userId = updates.userId || data.userId;
        const userStateRef = doc(db, this.userCheckoutStateCollectionName, userId);
        t.set(userStateRef, {
          userId,
          latestAttemptId: idempotencyKey,
          orderId: updates.orderId || data.orderId,
          cartOwnerId: updates.cartOwnerId || data.cartOwnerId,
          fencingToken: updates.fencingToken ?? data.fencingToken ?? null,
          updatedAt: serverTimestamp(),
        }, { merge: true });
      }
    };

    await runTransaction(db, operation);
  }

  async transitionCheckoutAttemptPhase(params: {
    attemptId: string;
    expectedPhases: CheckoutWorkflowPhase[];
    nextPhase: CheckoutWorkflowPhase;
    authoritySource: CheckoutAuthoritySource;
    waitingFor: CheckoutWaitingFor;
    reason: string;
    evidence?: CheckoutTransitionEvidence;
    orderId?: string | null;
    paymentIntentId?: string | null;
    actor?: string;
  }, transaction?: any): Promise<void> {
    const db = getUnifiedDb();
    const attemptRef = doc(db, this.checkoutAttemptCollectionName, params.attemptId);
    const transitionAt = new Date().toISOString();

    const operation = async (t: any) => {
      const snap = await t.get(attemptRef);
      if (!snap.exists()) {
        throw new Error(`Checkout attempt ${params.attemptId} not found`);
      }

      const data = snap.data();
      const currentPhase = data.currentPhase as CheckoutWorkflowPhase | undefined;
      if (currentPhase && !params.expectedPhases.includes(currentPhase)) {
        throw new Error(`Checkout phase stale update rejected for ${params.attemptId}: expected ${params.expectedPhases.join(', ')}, found ${currentPhase} (${params.reason})`);
      }
      assertLegalCheckoutPhaseTransition(currentPhase, params.nextPhase, params.reason);

      const oldCheckoutPhase = data.checkoutPhase as CheckoutPhase | undefined || mapWorkflowPhaseToCheckoutPhase(currentPhase, data.state, params.reason);
      const nextCheckoutPhase = mapWorkflowPhaseToCheckoutPhase(
        params.nextPhase, 
        params.nextPhase === 'RECOVER_OR_RECONCILE' ? 'reconciling' : (params.nextPhase === 'COMPLETE_CHECKOUT' ? 'paid' : data.state),
        params.reason
      );
      assertLegalCheckoutOperationalPhaseTransition(oldCheckoutPhase, nextCheckoutPhase, params.reason);

      const payload: Record<string, any> = {
        currentPhase: params.nextPhase,
        checkoutPhase: nextCheckoutPhase,
        authoritySource: params.authoritySource,
        waitingFor: params.waitingFor,
        lastTransitionAt: transitionAt,
        lastTransitionReason: params.reason,
        updatedAt: serverTimestamp(),
        [`phaseTransitions.${Date.now()}`]: {
          previousPhase: oldCheckoutPhase || null,
          previousWorkflowPhase: currentPhase || null,
          previousStatus: data.state || null,
          nextPhase: nextCheckoutPhase,
          nextWorkflowPhase: params.nextPhase,
          nextStatus: params.nextPhase === 'COMPLETE_CHECKOUT' ? 'paid' : (params.nextPhase === 'RECOVER_OR_RECONCILE' ? 'cancelled' : data.state || null),
          authoritySource: params.authoritySource,
          actor: params.actor ?? 'system',
          reason: params.reason,
          attemptId: params.attemptId,
          orderId: params.orderId ?? data.orderId ?? null,
          paymentIntentId: params.paymentIntentId ?? data.paymentIntentId ?? null,
          transitionedAt: transitionAt,
          evidence: params.evidence || [],
        },
      };
      if (params.orderId !== undefined) payload.orderId = params.orderId;
      if (params.paymentIntentId !== undefined) payload.paymentIntentId = params.paymentIntentId;
      if (params.evidence) payload.phaseTransitionEvidence = params.evidence;

      t.update(attemptRef, payload);

      logger.info('checkout_phase_transition', {
        attemptId: params.attemptId,
        idempotencyKey: data.idempotencyKey || params.attemptId,
        oldPhase: currentPhase || null,
        newPhase: params.nextPhase,
        authoritySource: params.authoritySource,
        waitingFor: params.waitingFor,
        reason: params.reason,
        orderId: params.orderId ?? data.orderId ?? null,
        paymentIntentId: params.paymentIntentId ?? data.paymentIntentId ?? null,
      });
    };

    if (transaction) await operation(transaction);
    else await runTransaction(db, operation);
  }

  async getCheckoutAttempt(idempotencyKey: string, transaction?: any): Promise<CheckoutAttempt | null> {
    const ref = doc(getUnifiedDb(), this.checkoutAttemptCollectionName, idempotencyKey);
    const snap = transaction ? await transaction.get(ref) : await getDoc(ref);
    if (!snap.exists()) return null;
    return this.mapDocToCheckoutAttempt(snap.id, snap.data());
  }

  async getLatestCheckoutAttemptForUser(userId: string, transaction?: any): Promise<CheckoutAttempt | null> {
    const db = getUnifiedDb();
    const stateRef = doc(db, this.userCheckoutStateCollectionName, userId);
    const stateSnap = transaction ? await transaction.get(stateRef) : await getDoc(stateRef);
    if (!stateSnap.exists()) return null;
    const latestAttemptId = stateSnap.data()?.latestAttemptId;
    if (!latestAttemptId) return null;
    return this.getCheckoutAttempt(latestAttemptId, transaction);
  }

  async createOrUpdateReconciliationCase(params: {
    paymentIntentId: string;
    orderId?: string | null;
    checkoutAttemptId?: string | null;
    reason: PaymentReconciliationReason;
    severity: 'high' | 'critical';
    lifecycleState?: PaymentReconciliationCaseLifecycleState;
    stripeStatus?: string | null;
    operatorVisibleMessage: string;
    nextAction: string;
    recommendedAction?: string;
    evidence?: Array<{ type: string; value: string; recordedAt: string }>;
    repairAttempt?: { attemptedAt: string; error?: string | null };
    details?: Record<string, any>;
    failureClassification?: PaymentReconciliationFailureClassification | 'transient' | 'terminal';
    lastObservedStripeState?: string | null;
    lastObservedLocalState?: string | null;
    blockingProductionReadiness?: boolean;
  }, transaction?: any): Promise<void> {
    const db = getUnifiedDb();
    const caseId = `${params.paymentIntentId}_${params.reason}`;
    const buildPayload = (caseExists: boolean) => {
      const recordedAt = new Date().toISOString();
      const defaultEvidence = [
        { type: 'paymentIntentId', value: params.paymentIntentId, recordedAt },
        params.orderId ? { type: 'orderId', value: params.orderId, recordedAt } : null,
        params.checkoutAttemptId ? { type: 'checkoutAttemptId', value: params.checkoutAttemptId, recordedAt } : null,
        params.stripeStatus ? { type: 'stripeStatus', value: params.stripeStatus, recordedAt } : null,
        { type: 'reason', value: params.reason, recordedAt },
      ].filter(Boolean);
      const payload: Record<string, any> = {
        id: caseId,
        paymentIntentId: params.paymentIntentId,
        orderId: params.orderId ?? null,
        checkoutAttemptId: params.checkoutAttemptId ?? null,
        reason: params.reason,
        severity: params.severity,
        lifecycleState: params.lifecycleState || 'open',
        stripeStatus: params.stripeStatus ?? null,
        operatorVisibleMessage: params.operatorVisibleMessage,
        nextAction: params.nextAction,
        recommendedAction: params.recommendedAction || params.nextAction,
        evidence: params.evidence || defaultEvidence,
        repairAttemptCount: caseExists ? increment(0) : 0,
        details: params.details || {},
        failureClassification: this.normalizeReconciliationClassification(params.failureClassification, params.reason),
        lastObservedStripeState: params.lastObservedStripeState ?? params.stripeStatus ?? null,
        lastObservedLocalState: params.lastObservedLocalState ?? null,
        blockingProductionReadiness: params.blockingProductionReadiness ?? params.severity === 'critical',
      };
      if (params.repairAttempt) {
        payload.lifecycleState = params.lifecycleState || 'repair_attempted';
        payload.repairAttemptCount = increment(1);
        payload.lastRepairAttemptAt = new Date(params.repairAttempt.attemptedAt);
        payload.lastRepairError = params.repairAttempt.error || null;
      }
      Object.keys(payload).forEach(key => {
        if (payload[key] === undefined) delete payload[key];
      });
      return payload;
    };

    if (transaction) {
      const ref = doc(db, this.reconciliationCaseCollectionName, caseId);
      transaction.set(ref, {
        ...buildPayload(true),
        updatedAt: serverTimestamp(),
      }, { merge: true });
      return;
    }

    const operation = async (t: any) => {
      const ref = doc(db, this.reconciliationCaseCollectionName, caseId);
      const snap = await t.get(ref);
      const payload = buildPayload(snap.exists());

      if (snap.exists()) {
        t.set(ref, {
          ...payload,
          updatedAt: serverTimestamp(),
        }, { merge: true });
      } else {
        t.set(ref, {
          ...payload,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
    };

    if (transaction) await operation(transaction);
    else await runTransaction(db, operation);
  }

  async getOpenReconciliationCases(options?: { limit?: number; reason?: PaymentReconciliationReason }): Promise<PaymentReconciliationCase[]> {
    let q = query(
      collection(getUnifiedDb(), this.reconciliationCaseCollectionName),
      where('lifecycleState', 'in', ['open', 'in_progress', 'repair_attempted', 'blocked']),
      orderBy('updatedAt', 'desc'),
      limit(options?.limit || 50)
    );

    if (options?.reason) {
      q = query(
        collection(getUnifiedDb(), this.reconciliationCaseCollectionName),
        where('lifecycleState', 'in', ['open', 'in_progress', 'repair_attempted', 'blocked']),
        where('reason', '==', options.reason),
        orderBy('updatedAt', 'desc'),
        limit(options?.limit || 50)
      );
    }

    const snapshot = await getDocs(q);
    return snapshot.docs.map((d: QueryDocumentSnapshot) => this.mapDocToReconciliationCase(d.id, d.data() as any));
  }

  async getReconciliationCase(caseId: string, transaction?: any): Promise<PaymentReconciliationCase | null> {
    const ref = doc(getUnifiedDb(), this.reconciliationCaseCollectionName, caseId);
    const snap = transaction ? await transaction.get(ref) : await getDoc(ref);
    if (!snap.exists()) return null;
    return this.mapDocToReconciliationCase(snap.id, snap.data());
  }

  async getStuckCheckoutStates(options?: { limit?: number }): Promise<{
    openReconciliationCases: PaymentReconciliationCase[];
    pendingPaidOrders: Order[];
    reconcilingPaidOrders: Order[];
    paidCancelledOrdersMissingReview: Order[];
    stuckCheckoutAttempts: CheckoutAttempt[];
  }> {
    const limitVal = options?.limit || 50;
    const openReconciliationCases = await this.getOpenReconciliationCases({ limit: limitVal });

    const pendingPaidSnap = await getDocs(query(
      collection(getUnifiedDb(), this.collectionName),
      where('paymentState', '==', 'paid'),
      where('status', '==', 'pending'),
      limit(limitVal)
    ));
    const reconcilingPaidSnap = await getDocs(query(
      collection(getUnifiedDb(), this.collectionName),
      where('paymentState', '==', 'paid'),
      where('reconciliationState', '==', 'needs_review'),
      limit(limitVal)
    ));
    const paidCancelledSnap = await getDocs(query(
      collection(getUnifiedDb(), this.collectionName),
      where('paymentState', '==', 'paid'),
      where('status', '==', 'cancelled'),
      limit(limitVal)
    ));
    const stuckAttemptStates: CheckoutAttemptState[] = ['reserved', 'payment_intent_created', 'reconciling', 'restore_blocked'];
    const stuckAttemptSnap = await getDocs(query(
      collection(getUnifiedDb(), this.checkoutAttemptCollectionName),
      where('state', 'in', stuckAttemptStates),
      orderBy('updatedAt', 'desc'),
      limit(limitVal)
    ));

    return {
      openReconciliationCases,
      pendingPaidOrders: pendingPaidSnap.docs.map((d: QueryDocumentSnapshot) => this.mapDocToOrder(d.id, d.data() as any)),
      reconcilingPaidOrders: reconcilingPaidSnap.docs.map((d: QueryDocumentSnapshot) => this.mapDocToOrder(d.id, d.data() as any)),
      paidCancelledOrdersMissingReview: paidCancelledSnap.docs
        .map((d: QueryDocumentSnapshot) => this.mapDocToOrder(d.id, d.data() as any))
        .filter((order: Order) => order.reconciliationState !== 'needs_review' && order.reconciliationState !== 'in_progress'),
      stuckCheckoutAttempts: stuckAttemptSnap.docs.map((d: QueryDocumentSnapshot) => this.mapDocToCheckoutAttempt(d.id, d.data() as any)),
    };
  }



  async updateFulfillment(orderId: string, data: { trackingNumber?: string; shippingCarrier?: string; trackingUrl?: string | null }, transaction?: any): Promise<void> {
    const docRef = doc(getUnifiedDb(), this.collectionName, orderId);
    const updateData: Record<string, any> = { updatedAt: serverTimestamp() };
    if (data.trackingNumber !== undefined) updateData.trackingNumber = data.trackingNumber;
    if (data.shippingCarrier !== undefined) updateData.shippingCarrier = data.shippingCarrier;
    if (data.trackingUrl !== undefined) updateData.trackingUrl = data.trackingUrl;
    if (transaction) transaction.update(docRef, updateData);
    else await updateDoc(docRef, updateData);
  }

  async updateRiskScore(orderId: string, score: number, transaction?: any): Promise<void> {
    const docRef = doc(getUnifiedDb(), this.collectionName, orderId);
    const data = { riskScore: score, updatedAt: serverTimestamp() };
    if (transaction) transaction.update(docRef, data);
    else await updateDoc(docRef, data);
  }

  async recordRefund(orderId: string, amount: number, transaction?: any): Promise<void> {
    const docRef = doc(getUnifiedDb(), this.collectionName, orderId);
    const data = { 
      refundedAmount: increment(amount), 
      updatedAt: serverTimestamp() 
    };
    if (transaction) transaction.update(docRef, data);
    else await updateDoc(docRef, data);
  }

  async markForReconciliation(orderId: string, notes: string[], appendOnly = false, transaction?: any): Promise<void> {
    const docRef = doc(getUnifiedDb(), this.collectionName, orderId);
    const payload: Record<string, any> = {
      reconciliationNotes: arrayUnion(...notes),
      updatedAt: serverTimestamp()
    };
    // appendOnly=true: used during resolution to record notes without re-locking the order
    if (!appendOnly) payload.reconciliationRequired = true;
    if (transaction) transaction.update(docRef, payload);
    else await updateDoc(docRef, payload);
  }

  async clearReconciliationFlag(orderId: string, transaction?: any): Promise<void> {
    const docRef = doc(getUnifiedDb(), this.collectionName, orderId);
    const data = { 
      reconciliationRequired: false, 
      updatedAt: serverTimestamp() 
    };
    if (transaction) transaction.update(docRef, data);
    else await updateDoc(docRef, data);
  }

  async updateMetadata(orderId: string, metadata: Record<string, any>, transaction?: any): Promise<void> {
    const docRef = doc(getUnifiedDb(), this.collectionName, orderId);
    
    // PRODUCTION HARDENING: Transform the metadata object into dot-notation updates
    // to prevent overwriting the entire metadata map. This ensures atomic property updates.
    const updates: Record<string, any> = {
      updatedAt: serverTimestamp()
    };
    
    Object.entries(metadata).forEach(([key, value]) => {
      updates[`metadata.${key}`] = value;
    });

    if (transaction) transaction.update(docRef, updates);
    else await updateDoc(docRef, updates);
  }

  async addFulfillmentEvent(orderId: string, event: import('@domain/models').OrderFulfillmentEvent, transaction?: any): Promise<void> {
    const docRef = doc(getUnifiedDb(), this.collectionName, orderId);
    const data = { fulfillmentEvents: arrayUnion(event), updatedAt: serverTimestamp() };
    if (transaction) transaction.update(docRef, data);
    else await updateDoc(docRef, data);
  }

  async addNote(orderId: string, note: import('@domain/models').OrderNote, transaction?: any): Promise<void> {
    const docRef = doc(getUnifiedDb(), this.collectionName, orderId);
    const data = { notes: arrayUnion(note), updatedAt: serverTimestamp() };
    if (transaction) transaction.update(docRef, data);
    else await updateDoc(docRef, data);
  }

  async getStats(): Promise<OrderStats> {
    const db = getUnifiedDb();
    const statsSnap = await getDoc(doc(db, this.statsDocPath));
    if (!statsSnap.exists()) {
      // Fallback to manual aggregation for initialization (First run)
      return this.initializeOrderStats();
    }
    return statsSnap.data() as OrderStats;
  }

  async getDashboardStats(): Promise<OrderStats> {
    return this.getStats();
  }

  private async initializeOrderStats(): Promise<OrderStats> {
    logger.info('[Stats] Initializing order stats via collection scan...');
    const db = getUnifiedDb();
    const snapshot = await getDocs(collection(db, this.collectionName));
    
    const stats: OrderStats = {
      totalRevenue: 0,
      totalOrders: 0,
      orderCountsByStatus: {} as any,
      dailyRevenue: {},
      updatedAt: new Date()
    };

    snapshot.forEach((d: any) => {
      const data = d.data();
      const status = data.status as OrderStatus;
      if (status !== 'cancelled' && status !== 'refunded') {
        stats.totalRevenue += data.total || 0;
        const createdAt = mapTimestamp(data.createdAt);
        const day = createdAt.toISOString().split('T')[0];
        stats.dailyRevenue[day] = (stats.dailyRevenue[day] || 0) + (data.total || 0);
      }
      stats.totalOrders++;
      stats.orderCountsByStatus[status] = (stats.orderCountsByStatus[status] || 0) + 1;
    });

    await setDoc(doc(db, this.statsDocPath), stats);
    return stats;
  }

  private applyOrderStatsDeltas(t: any, updates: { 
    revenueDelta?: number; 
    orderDelta?: number; 
    statusChanges?: { from?: OrderStatus; to: OrderStatus }[] 
  }) {
    const db = getUnifiedDb();
    const statsRef = doc(db, this.statsDocPath);
    
    const firestoreUpdates: any = {
      updatedAt: serverTimestamp()
    };

    if (updates.revenueDelta) {
      firestoreUpdates.totalRevenue = increment(updates.revenueDelta);
      const today = new Date().toISOString().split('T')[0];
      firestoreUpdates[`dailyRevenue.${today}`] = increment(updates.revenueDelta);
    }
    
    if (updates.orderDelta) {
      firestoreUpdates.totalOrders = increment(updates.orderDelta);
    }

    if (updates.statusChanges) {
      const increments: Record<string, number> = {};
      for (const change of updates.statusChanges) {
        if (change.from) {
          increments[change.from] = (increments[change.from] || 0) - 1;
        }
        increments[change.to] = (increments[change.to] || 0) + 1;
      }

      for (const [status, delta] of Object.entries(increments)) {
        if (delta !== 0) {
          firestoreUpdates[`orderCountsByStatus.${status}`] = increment(delta);
        }
      }
    }

    t.set(statsRef, firestoreUpdates, { merge: true });
  }


  async getTopProducts(limitVal: number): Promise<Array<{ id: string; name: string; revenue: number; sales: number }>> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const q = query(
      collection(getUnifiedDb(), this.collectionName), 
      where('createdAt', '>=', Timestamp.fromDate(thirtyDaysAgo))
    );
    const snapshot = await getDocs(q);
    const productStats: Record<string, { name: string; revenue: number; sales: number }> = {};

    snapshot.forEach((d: any) => {
      const data = d.data();
      if (data.status === 'cancelled') return;
      
      const items = (data.items || []) as OrderItem[];
      items.forEach(item => {
        if (!productStats[item.productId]) {
          productStats[item.productId] = { name: item.name, revenue: 0, sales: 0 };
        }
        productStats[item.productId].revenue += item.unitPrice * item.quantity;
        productStats[item.productId].sales += item.quantity;
      });
    });

    return Object.entries(productStats)
      .map(([id, stats]) => ({ id, ...stats }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, limitVal);
  }

  private async calculateRiskScore(order: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>): Promise<number> {
    let score = 5; // Base score

    // 1. Stripe Radar Integration (Primary Signal)
    // If Stripe has already performed advanced ML risk analysis, we weight it heavily.
    const stripeRisk = order.metadata?.stripe_risk_score; // 0-100
    if (typeof stripeRisk === 'number') {
      return stripeRisk; // Trust Stripe's ML substrate
    }

    // 2. Velocity Check: Rapid successive orders from same user
    if (order.userId) {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      const recent = await this.getByUserId(order.userId, { from: fiveMinutesAgo, limit: 10 });
      if (recent.orders.length >= 3) score += 40; // High velocity
      if (recent.orders.length >= 1) score += 5;
    }

    // 3. Email Reputation (Forensic Discovery)
    const disposableDomains = ['tempmail.com', '10minutemail.com', 'guerrillamail.com', 'sharklasers.com', 'mailinator.com'];
    const email = (order.customerEmail || '').toLowerCase();
    if (disposableDomains.some(domain => email.endsWith(domain))) {
      score += 50; // Extremely high risk signal
    }

    // 4. Threshold & Volume Checks
    if (order.total > 50000) score += 10; // >$500
    if (order.total > 150000) score += 25; // >$1500
    if (!order.userId && order.total > 20000) score += 20; // Unauthenticated high-value

    const totalQty = order.items.reduce((sum, i) => sum + i.quantity, 0);
    if (totalQty > 20) score += 15;
    
    // 5. Geographical Signals
    const country = (order.shippingAddress.country || '').toUpperCase();
    if (country !== 'US' && country !== 'CA' && country !== 'GB' && country !== 'AU') {
      score += 20; // International non-primary markets
    }

    // 6. Heuristics: High-risk item combinations
    const hasDigital = order.items.some(i => i.isDigital);
    const hasPhysical = order.items.some(i => !i.isDigital);
    if (hasDigital && hasPhysical) score += 10;

    const hasExpensiveItem = order.items.some(i => i.unitPrice > 30000); // >$300 item
    if (hasExpensiveItem) score += 15;

    return Math.min(score, 100);
  }

  async hasUsedDiscount(userId: string, discountCode: string): Promise<boolean> {
    // Production Hardening: Exclude cancelled/refunded orders from usage check.
    const q = query(
      collection(getUnifiedDb(), this.collectionName),
      where('userId', '==', userId),
      where('discountCode', '==', discountCode),
      limit(10)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.some((d: QueryDocumentSnapshot) => {
      const status = d.data().status;
      return status !== 'cancelled' && status !== 'refunded';
    });
  }

  /**
   * Transactional check for user-specific discount usage.
   * Uses a dedicated document to ensure atomicity via point-read (t.get).
   */
  async checkUserDiscountUsage(userId: string, discountCode: string, transaction: any): Promise<boolean> {
    const id = `${userId}_${discountCode}`;
    const docRef = doc(getUnifiedDb(), 'user_discount_usage', id);
    const docSnap = await transaction.get(docRef);
    return docSnap.exists();
  }

  /**
   * Records a user's discount usage atomically.
   */
  async recordUserDiscountUsage(userId: string, discountCode: string, transaction: any): Promise<void> {
    const id = `${userId}_${discountCode}`;
    const docRef = doc(getUnifiedDb(), 'user_discount_usage', id);
    transaction.set(docRef, { used: true, usedAt: serverTimestamp() });
  }
  
  async removeUserDiscountUsage(userId: string, discountCode: string, transaction: any): Promise<void> {
    const id = `${userId}_${discountCode}`;
    const docRef = doc(getUnifiedDb(), 'user_discount_usage', id);
    transaction.delete(docRef);
  }

  async markHeartbeat(orderId: string, userId: string, email: string): Promise<void> {
    const claimId = `${orderId}_${userId}`;
    const docRef = doc(getUnifiedDb(), 'order_claims', claimId);
    await setDoc(docRef, {
      orderId,
      userId,
      email,
      lastActive: serverTimestamp()
    }, { merge: true });
  }

  async getActiveViewers(orderId: string): Promise<Array<{ userId: string, email: string, lastActive: Date }>> {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const q = query(
      collection(getUnifiedDb(), 'order_claims'),
      where('orderId', '==', orderId),
      where('lastActive', '>=', Timestamp.fromDate(fiveMinutesAgo))
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d: QueryDocumentSnapshot) => {
      const data = d.data();
      return {
        userId: data.userId,
        email: data.email,
        lastActive: (data.lastActive as any).toDate()
      };
    });
  }

  async getLogisticsStats(): Promise<{
    avgFulfillmentTimeHours: number;
    onTimeDeliveryRate: number;
    carrierPerformance: Record<string, { avgTransitDays: number; breachRate: number }>;
    shippingProfitability: number;
  }> {
    const db = getUnifiedDb();
    // We fetch a sample of delivered orders to calculate performance
    const q = query(
      collection(db, this.collectionName), 
      where('status', '==', 'delivered'),
      limit(500)
    );
    const snapshot = await getDocs(q);
    
    let totalFulfillmentTimeMs = 0;
    let deliveredCount = 0;
    let onTimeCount = 0;
    let totalShippingRevenue = 0;
    let totalShippingCost = 0;

    const carrierStats: Record<string, { totalTransitTimeMs: number; count: number; breaches: number }> = {};

    snapshot.forEach((d: any) => {
      const data = d.data();
      const createdAt = mapTimestamp(data.createdAt);
      const updatedAt = mapTimestamp(data.updatedAt);
      
      totalFulfillmentTimeMs += (updatedAt.getTime() - createdAt.getTime());
      deliveredCount++;

      // On-time calculation
      if (data.estimatedDeliveryDate) {
        const estimated = mapTimestamp(data.estimatedDeliveryDate);
        if (updatedAt <= estimated) onTimeCount++;
      }

      totalShippingRevenue += data.shippingAmount || 0;
      const trackedCost = (data.fulfillments || []).reduce((sum: number, f: any) => sum + (f.costCents || f.cost || 0), 0);
      const metadataCost = data.metadata?.shippingCostCents || data.metadata?.postageCostCents || data.metadata?.labelCostCents || 0;
      const totalCost = trackedCost || metadataCost;
      totalShippingCost += totalCost;

      // Carrier stats
      (data.fulfillments || []).forEach((f: any) => {
        const carrier = f.shippingCarrier || 'Unknown';
        if (!carrierStats[carrier]) {
          carrierStats[carrier] = { totalTransitTimeMs: 0, count: 0, breaches: 0 };
        }
        
        const fEvents = data.fulfillmentEvents || [];
        const shippedEvent = fEvents.find((e: any) => e.type === 'shipped');
        const deliveredEvent = fEvents.find((e: any) => e.type === 'delivered');
        
        if (shippedEvent && deliveredEvent) {
          const transitTime = mapTimestamp(deliveredEvent.at).getTime() - mapTimestamp(shippedEvent.at).getTime();
          carrierStats[carrier].totalTransitTimeMs += transitTime;
          carrierStats[carrier].count++;
          
          if (data.estimatedDeliveryDate && mapTimestamp(deliveredEvent.at) > mapTimestamp(data.estimatedDeliveryDate)) {
            carrierStats[carrier].breaches++;
          }
        }
      });
    });

    const performance: Record<string, { avgTransitDays: number; breachRate: number }> = {};
    for (const [carrier, stats] of Object.entries(carrierStats)) {
      performance[carrier] = {
        avgTransitDays: stats.count > 0 ? (stats.totalTransitTimeMs / stats.count) / (1000 * 60 * 60 * 24) : 0,
        breachRate: stats.count > 0 ? stats.breaches / stats.count : 0
      };
    }

    return {
      avgFulfillmentTimeHours: deliveredCount > 0 ? (totalFulfillmentTimeMs / deliveredCount) / (1000 * 60 * 60) : 0,
      onTimeDeliveryRate: deliveredCount > 0 ? (onTimeCount / deliveredCount) * 100 : 100,
      carrierPerformance: performance,
      shippingProfitability: totalShippingRevenue - totalShippingCost
    };
  }
}
