import type {
  CheckoutWorkflowPhase,
  FulfillmentState,
  PaymentState,
} from '@domain/models';

export const CHECKOUT_PHASE_TRANSITIONS: Record<CheckoutWorkflowPhase, CheckoutWorkflowPhase[]> = {
  PREPARE_CHECKOUT: ['ACQUIRE_RESERVATION'],
  ACQUIRE_RESERVATION: ['CREATE_OR_RESUME_ATTEMPT'],
  CREATE_OR_RESUME_ATTEMPT: ['INITIALIZE_ORDER', 'CREATE_OR_RESUME_PAYMENT_INTENT'],
  INITIALIZE_ORDER: ['CREATE_OR_RESUME_PAYMENT_INTENT'],
  CREATE_OR_RESUME_PAYMENT_INTENT: ['AWAIT_PAYMENT_CONFIRMATION'],
  AWAIT_PAYMENT_CONFIRMATION: ['FINALIZE_PAYMENT', 'RECOVER_OR_RECONCILE'],
  FINALIZE_PAYMENT: ['COMPLETE_CHECKOUT', 'RECOVER_OR_RECONCILE'],
  RECOVER_OR_RECONCILE: ['COMPLETE_CHECKOUT'],
  COMPLETE_CHECKOUT: [],
};

export function isLegalCheckoutPhaseTransition(
  currentPhase: CheckoutWorkflowPhase | null | undefined,
  nextPhase: CheckoutWorkflowPhase
): boolean {
  if (!currentPhase) return nextPhase === 'PREPARE_CHECKOUT' || nextPhase === 'ACQUIRE_RESERVATION' || nextPhase === 'CREATE_OR_RESUME_ATTEMPT';
  if (currentPhase === nextPhase) return true;
  return CHECKOUT_PHASE_TRANSITIONS[currentPhase]?.includes(nextPhase) ?? false;
}

export function assertLegalCheckoutPhaseTransition(
  currentPhase: CheckoutWorkflowPhase | null | undefined,
  nextPhase: CheckoutWorkflowPhase,
  reason: string
): void {
  if (!isLegalCheckoutPhaseTransition(currentPhase, nextPhase)) {
    throw new Error(`Checkout phase transition rejected: ${currentPhase || 'unset'} -> ${nextPhase} (${reason})`);
  }
}

export function isSafelyFinalizedCheckoutState(params: {
  paymentState?: PaymentState | null;
  fulfillmentState?: FulfillmentState | null;
}): boolean {
  return params.paymentState === 'paid'
    && ['processing', 'ready_for_pickup', 'delivery_started', 'shipped', 'delivered'].includes(params.fulfillmentState || '');
}
