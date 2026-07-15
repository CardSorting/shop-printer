import type { Address } from '@domain/models';
import type { ReconciliationOperatorAction } from './checkoutTypes';
import type { CheckoutResult } from './checkoutResult';

export type CreateCheckoutSessionInput = {
  userId: string;
  shippingAddress: Address;
  idempotencyKey: string;
  userEmail?: string;
  userName?: string;
  discountCode?: string;
  requireHighValueStepUp?: () => Promise<void>;
};

export type CreateCheckoutSessionData = {
  clientSecret: string;
  paymentIntentId: string;
  orderId: string;
  amount: number;
  paymentStatus: string;
  expiresAt?: string;
  resumed?: boolean;
};

export type HandleCheckoutWebhookInput = {
  rawBody: string;
  signature: string;
};

export type HandleCheckoutWebhookData = {
  httpStatus: number;
  received: boolean;
  duplicate?: boolean;
  retry?: boolean;
};

export type HandleCheckoutWebhookResult = {
  status: number;
  body: {
    error?: string;
    received?: boolean;
    duplicate?: boolean;
    retry?: boolean;
  };
};

export type HandleOperatorActionInput = {
  caseId: string;
  action: ReconciliationOperatorAction;
  reason: string;
  actor: { id: string; email: string };
};

export type HandleOperatorActionData = {
  applied: true;
};

export type CleanupExpiredPendingOrdersInput = {
  maxAgeMinutes: number;
};

export type CheckoutCleanupError = {
  orderId: string;
  code: 'stripe_lookup_failed' | 'active_payment_intent' | 'cancel_failed' | 'finalize_failed';
  message: string;
  retryable: boolean;
};

export type CleanupExpiredPendingOrdersReport = {
  scanned: number;
  expired: number;
  cancelled: number;
  failed: number;
  errors: CheckoutCleanupError[];
};

export type RecoverPendingOrderInput = {
  userId: string;
  paymentIntentId: string;
};

export type RecoverPendingOrderData = {
  success: boolean;
  orderId?: string;
  status?: string;
  message?: string;
};

/**
 * Public checkout boundary. Routes and UI adapters depend only on this interface.
 * Every method returns CheckoutResult<T> for typed success/failure contracts.
 */
export interface CheckoutApplicationService {
  createCheckoutSession(
    input: CreateCheckoutSessionInput,
  ): Promise<CheckoutResult<CreateCheckoutSessionData>>;
  handleCheckoutWebhook(
    input: HandleCheckoutWebhookInput,
  ): Promise<CheckoutResult<HandleCheckoutWebhookData>>;
  handleReconciliationOperatorAction(
    input: HandleOperatorActionInput,
  ): Promise<CheckoutResult<HandleOperatorActionData>>;
  cleanupExpiredPendingOrders(
    input: CleanupExpiredPendingOrdersInput,
  ): Promise<CheckoutResult<CleanupExpiredPendingOrdersReport>>;
  recoverPendingOrder(
    input: RecoverPendingOrderInput,
  ): Promise<CheckoutResult<RecoverPendingOrderData>>;
}
