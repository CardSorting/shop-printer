/**
 * Checkout UI module — commitment presentation only.
 * Money capture leaves through services.checkout / checkout API routes.
 */
export { StripeCheckoutForm } from './StripeCheckoutForm';
export { stripePromise, isStripeConfigured } from './stripeClient';
export { gateCheckoutCommit } from './validateBeforeCommit';
export type { CheckoutCommitGate } from './validateBeforeCommit';
