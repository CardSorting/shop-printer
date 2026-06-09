import type { IOrderRepository } from '@domain/repositories';
import { logger } from '@utils/logger';

export type CheckoutOrderState =
  | 'pending_payment'
  | 'checkout_session_created'
  | 'paid'
  | 'payment_failed'
  | 'expired'
  | 'recovery_pending'
  | 'recovered'
  | 'cancelled'
  | 'reconciliation_required'
  | 'resolved';

const LEGAL_CHECKOUT_ORDER_STATE_TRANSITIONS: Record<CheckoutOrderState, CheckoutOrderState[]> = {
  pending_payment: ['checkout_session_created', 'payment_failed', 'expired', 'cancelled', 'reconciliation_required'],
  checkout_session_created: ['paid', 'payment_failed', 'recovery_pending', 'reconciliation_required', 'cancelled', 'expired'],
  paid: ['recovered', 'resolved', 'reconciliation_required'],
  payment_failed: ['recovery_pending', 'reconciliation_required', 'cancelled'],
  expired: ['cancelled', 'recovery_pending', 'reconciliation_required'],
  recovery_pending: ['recovered', 'paid', 'reconciliation_required', 'cancelled'],
  recovered: ['resolved'],
  cancelled: ['resolved'],
  reconciliation_required: ['recovered', 'resolved', 'paid', 'cancelled'],
  resolved: [],
};

export function isLegalCheckoutOrderStateTransition(
  from: CheckoutOrderState | null | undefined,
  to: CheckoutOrderState,
): boolean {
  if (!from) return to === 'pending_payment' || to === 'checkout_session_created';
  if (from === to) return true;
  return LEGAL_CHECKOUT_ORDER_STATE_TRANSITIONS[from]?.includes(to) ?? false;
}

export async function transitionCheckoutOrderState(params: {
  orderRepo: IOrderRepository;
  orderId: string;
  from: CheckoutOrderState | CheckoutOrderState[] | null;
  to: CheckoutOrderState;
  reason: string;
  source: string;
  stripeEventId?: string | null;
  paymentIntentId?: string | null;
  reconciliationCaseId?: string | null;
}): Promise<void> {
  const order = await params.orderRepo.getById(params.orderId);
  if (!order) {
    logger.warn('checkout_order_state_order_missing', {
      orderId: params.orderId,
      to: params.to,
      reason: params.reason,
      source: params.source,
    });
    return;
  }

  const current = (order.metadata?.checkoutOrderState as CheckoutOrderState | undefined) ?? 'pending_payment';
  const allowedFrom = params.from == null
    ? [current]
    : Array.isArray(params.from)
      ? params.from
      : [params.from];

  if (!allowedFrom.includes(current) && current !== params.to) {
    logger.warn('checkout_order_state_transition_rejected', {
      orderId: params.orderId,
      current,
      requestedFrom: allowedFrom,
      to: params.to,
      reason: params.reason,
      source: params.source,
    });
    return;
  }

  if (!isLegalCheckoutOrderStateTransition(current, params.to) && current !== params.to) {
    logger.warn('checkout_order_state_illegal_transition', {
      orderId: params.orderId,
      current,
      to: params.to,
      reason: params.reason,
      source: params.source,
    });
    return;
  }

  const stripeIdentity = {
    orderId: params.orderId,
    checkoutSessionId: order.metadata?.stripeIdentity?.checkoutSessionId ?? order.metadata?.checkoutSessionId ?? null,
    paymentIntentId: params.paymentIntentId ?? order.paymentTransactionId ?? order.metadata?.stripeIdentity?.paymentIntentId ?? null,
    lastStripeEventId: params.stripeEventId ?? order.metadata?.stripeIdentity?.lastStripeEventId ?? null,
    reconciliationCaseId: params.reconciliationCaseId ?? order.metadata?.stripeIdentity?.reconciliationCaseId ?? null,
  };

  await params.orderRepo.updateMetadata(params.orderId, {
    checkoutOrderState: params.to,
    checkoutOrderStateReason: params.reason,
    checkoutOrderStateSource: params.source,
    checkoutOrderStateAt: new Date().toISOString(),
    stripeIdentity,
  });
}
