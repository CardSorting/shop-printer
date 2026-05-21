import type {
  CheckoutWorkflowPhase,
  FulfillmentState,
  PaymentState,
} from '@domain/models';

export type CheckoutPhase =
  | 'preparing'
  | 'reservation_acquired'
  | 'attempt_active'
  | 'payment_intent_ready'
  | 'order_initialized'
  | 'awaiting_payment'
  | 'payment_confirmed'
  | 'finalized'
  | 'recovery_required'
  | 'reconciliation_required'
  | 'terminal';

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

export const LEGAL_CHECKOUT_PHASE_TRANSITIONS: Record<CheckoutPhase, CheckoutPhase[]> = {
  preparing: ['reservation_acquired', 'terminal'],
  reservation_acquired: ['attempt_active', 'recovery_required', 'terminal'],
  attempt_active: ['order_initialized', 'payment_intent_ready', 'recovery_required', 'terminal'],
  order_initialized: ['payment_intent_ready', 'recovery_required', 'terminal'],
  payment_intent_ready: ['awaiting_payment', 'recovery_required', 'terminal'],
  awaiting_payment: ['payment_confirmed', 'reconciliation_required', 'recovery_required', 'terminal'],
  payment_confirmed: ['finalized', 'reconciliation_required', 'recovery_required', 'terminal'],
  finalized: [],
  recovery_required: ['attempt_active', 'reconciliation_required', 'terminal'],
  reconciliation_required: ['finalized', 'terminal'],
  terminal: [],
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

export function isLegalCheckoutPhaseTransitionNew(
  current: CheckoutPhase | null | undefined,
  next: CheckoutPhase
): boolean {
  if (!current) return next === 'preparing' || next === 'reservation_acquired';
  if (current === next) return true;
  return LEGAL_CHECKOUT_PHASE_TRANSITIONS[current]?.includes(next) ?? false;
}

export function assertLegalCheckoutPhaseTransitionNew(
  current: CheckoutPhase | null | undefined,
  next: CheckoutPhase,
  reason: string
): void {
  if (!isLegalCheckoutPhaseTransitionNew(current, next)) {
    throw new Error(`Checkout phase transition rejected: ${current || 'unset'} -> ${next} (${reason})`);
  }
}

export function mapWorkflowPhaseToCheckoutPhase(
  phase: CheckoutWorkflowPhase | null | undefined,
  state?: string | null,
  reason?: string | null
): CheckoutPhase {
  if (!phase) return 'preparing';
  switch (phase) {
    case 'PREPARE_CHECKOUT':
      return 'preparing';
    case 'ACQUIRE_RESERVATION':
      return 'reservation_acquired';
    case 'CREATE_OR_RESUME_ATTEMPT':
      return 'attempt_active';
    case 'INITIALIZE_ORDER':
      return 'order_initialized';
    case 'CREATE_OR_RESUME_PAYMENT_INTENT':
      return 'payment_intent_ready';
    case 'AWAIT_PAYMENT_CONFIRMATION':
      return 'awaiting_payment';
    case 'FINALIZE_PAYMENT':
      return 'payment_confirmed';
    case 'COMPLETE_CHECKOUT':
      return 'finalized';
    case 'RECOVER_OR_RECONCILE':
      if (state === 'reconciling' || (reason && reason.includes('reconciliation'))) return 'reconciliation_required';
      if (state === 'cancelled' || state === 'restore_blocked' || state === 'restored' || (reason && reason.includes('rollback'))) return 'terminal';
      return 'recovery_required';
    default:
      return 'preparing';
  }
}

export function isSafelyFinalizedCheckoutState(params: {
  paymentState?: PaymentState | null;
  fulfillmentState?: FulfillmentState | null;
}): boolean {
  return params.paymentState === 'paid'
    && ['processing', 'ready_for_pickup', 'delivery_started', 'shipped', 'delivered'].includes(params.fulfillmentState || '');
}
