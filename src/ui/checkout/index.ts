/**
 * Checkout UI module — commitment presentation only.
 * Money capture leaves through services.checkout / checkout API routes.
 */
export { StripeCheckoutForm } from './StripeCheckoutForm';
export { stripePromise, isStripeConfigured } from './stripeClient';
export { gateCheckoutCommit } from './validateBeforeCommit';
export type { CheckoutCommitGate } from './validateBeforeCommit';
export {
  checkoutSessionNeedsPayment,
  checkoutStatusNeedsPayment,
  checkoutStatusRequiresRestart,
  clearActiveCheckoutSession,
  createClientCheckoutSession,
  getOrCreateCheckoutAttemptKey,
  markCheckoutPaymentRequired,
  markCheckoutPaymentSubmitted,
  readActiveCheckoutSession,
  saveActiveCheckoutSession,
} from './clientCheckoutState';
export type {
  CheckoutSessionStart,
  ClientCheckoutPhase,
  ClientCheckoutSession,
} from './clientCheckoutState';
export {
  CheckoutFinalizationError,
  finalizeClientCheckout,
} from './clientCheckoutFlow';
export type { CheckoutVerification } from './clientCheckoutFlow';
