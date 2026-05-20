import { describe, expect, it } from 'vitest';
import {
  assertLegalCheckoutPhaseTransition,
  isLegalCheckoutPhaseTransition,
  isSafelyFinalizedCheckoutState,
} from '../core/order/checkoutWorkflow';

describe('checkout workflow orchestration contract', () => {
  it('allows convergent legal transitions without requiring one exact sequential path', () => {
    expect(isLegalCheckoutPhaseTransition('CREATE_OR_RESUME_ATTEMPT', 'INITIALIZE_ORDER')).toBe(true);
    expect(isLegalCheckoutPhaseTransition('CREATE_OR_RESUME_ATTEMPT', 'CREATE_OR_RESUME_PAYMENT_INTENT')).toBe(true);
    expect(isLegalCheckoutPhaseTransition('AWAIT_PAYMENT_CONFIRMATION', 'RECOVER_OR_RECONCILE')).toBe(true);
    expect(isLegalCheckoutPhaseTransition('RECOVER_OR_RECONCILE', 'COMPLETE_CHECKOUT')).toBe(true);
  });

  it('rejects illegal phase regressions and corruption', () => {
    expect(() => assertLegalCheckoutPhaseTransition('COMPLETE_CHECKOUT', 'FINALIZE_PAYMENT', 'replay_after_completion'))
      .toThrow(/transition rejected/i);
    expect(() => assertLegalCheckoutPhaseTransition('AWAIT_PAYMENT_CONFIRMATION', 'INITIALIZE_ORDER', 'stale_worker'))
      .toThrow(/transition rejected/i);
    expect(() => assertLegalCheckoutPhaseTransition('CREATE_OR_RESUME_PAYMENT_INTENT', 'COMPLETE_CHECKOUT', 'skipped_payment_truth'))
      .toThrow(/transition rejected/i);
  });

  it('only early-exits when payment and fulfillment truth are both finalized', () => {
    expect(isSafelyFinalizedCheckoutState({ paymentState: 'paid', fulfillmentState: 'processing' })).toBe(true);
    expect(isSafelyFinalizedCheckoutState({ paymentState: 'paid', fulfillmentState: 'delivered' })).toBe(true);
    expect(isSafelyFinalizedCheckoutState({ paymentState: 'paid', fulfillmentState: 'cancelled' })).toBe(false);
    expect(isSafelyFinalizedCheckoutState({ paymentState: 'unpaid', fulfillmentState: 'processing' })).toBe(false);
  });
});
