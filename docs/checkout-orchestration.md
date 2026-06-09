# Checkout Orchestration

Checkout is a monolith-local workflow. It coordinates cart reservation, order creation, Stripe PaymentIntent creation, payment finalization, rollback, reconciliation, and operator recovery without introducing distributed infrastructure.

## Entry Point

```text
Routes / UI / webhooks
  -> getServerServices().checkout   (container top-level)
       -> createCheckoutStack() -> { checkout, mutations }
            -> CheckoutFlowService
                 -> checkoutClientStartFlow / checkoutPaymentMethodFlow / checkoutStripeWebhookFlow
                 -> CheckoutMutationService (CheckoutMutationBackend — internal)
                 -> checkoutOrderResolver / checkoutPaymentIntentFlow / checkoutVerifyFlow
```

`OrderService` has no checkout dependency. System cleanup, operator recovery retries, and all payment flows go through `services.checkout`.

## Responsibilities

- `CheckoutFlowService` (`services.checkout`) is the **only** public checkout API. Legacy `OrderService.initiateCheckout`, `placeOrder`, `finalizeTrustedCheckout`, and related passthroughs have been removed.
- `CheckoutMutationService` implements `CheckoutMutationBackend` (`runCheckoutReservation`, `confirmStripePayment`, `rollbackUnpaidCheckout`) — internal only, constructed via `createCheckoutStack()`.
- `checkoutStripeWebhookFlow.ts` owns `payment_intent.payment_failed` convergence logic.
- `checkoutOrderResolver.ts` is the single order lookup path (`paymentTransactionId` → `metadata.orderId` fallback).
- `checkoutPaymentIntentFlow.ts` owns client PaymentIntent create/resume phase transitions and rollback side effects.
- Checkout API routes are thin HTTP adapters that call `services.checkout.*` — they should not compose primitives or resolution chains directly.

### CheckoutFlowService API

| Method | Used by |
|--------|---------|
| `startClientCheckout` | `POST /api/checkout/create-payment-intent` |
| `reserveCheckout` | Inventory reservation without payment (benchmarks, tests) |
| `completeWithPaymentMethod` | `POST /api/orders`, UI checkout |
| `verifyPaymentFromClient` | `GET /api/checkout/verify` |
| `confirmPaymentFromStripe` | Stripe `payment_intent.succeeded` webhook, cleanup, reconciliation retry |
| `handleStripePaymentFailed` | Stripe `payment_intent.payment_failed` webhook |
| `rollbackUnpaidCheckout` | System cleanup, forensic rollback |
| `cleanupExpiredPendingOrders` | `POST /api/system/cleanup-orders` (cancel wired at stack construction) |
| `handleReconciliationOperatorAction` | Admin reconciliation operator actions (`retry_recovery` runs recovery + resolve) |
| `completeOperatorRetryRecovery` | Internal recovery step used by `handleReconciliationOperatorAction` |
| `resolveOrder` | Order lookup by PaymentIntent (internal/webhook helpers) |
- `FirestoreOrderRepository.transitionCheckoutAttemptPhase` is the only writer for checkout attempt phase fields.
- `OrderAdminService` owns reconciliation case summaries, forensic timeline reads, and operator actions.
- `checkoutForensics.ts` renders timelines and diagnostics for operators.

## State Diagram

```text
PREPARE_CHECKOUT
  -> ACQUIRE_RESERVATION
  -> CREATE_OR_RESUME_ATTEMPT
  -> INITIALIZE_ORDER
  -> CREATE_OR_RESUME_PAYMENT_INTENT
  -> AWAIT_PAYMENT_CONFIRMATION
  -> FINALIZE_PAYMENT
  -> COMPLETE_CHECKOUT

Any in-flight checkout before completion
  -> RECOVER_OR_RECONCILE

RECOVER_OR_RECONCILE
  -> COMPLETE_CHECKOUT      when Stripe/local state converges safely
  -> operator reconciliation when payment ownership, mapping, or persistence is unsafe
```

The persisted workflow phase is intentionally explicit. The operational phase is a smaller read model used for diagnostics:

```text
preparing -> reservation_acquired -> attempt_active -> order_initialized
  -> payment_intent_ready -> awaiting_payment -> payment_confirmed -> finalized

recovery_required and reconciliation_required are exception views.
terminal covers cancelled/restored rollback outcomes.
```

## Creation Flow

1. Validate the shipping address and acquire the user checkout lock.
2. Create or resume the checkout attempt.
3. Create a pending order, reserve inventory, persist reservation metadata, clear the cart.
4. Create or resume the Stripe PaymentIntent.
5. Persist the PaymentIntent ID and move the attempt to `AWAIT_PAYMENT_CONFIRMATION`.
6. Return the client secret. Stripe webhook or success-page verification performs finalization.

## Payment Confirmation

Stripe is treated as the payment authority, but local fulfillment only proceeds after local state is updated in a transaction.

Finalization does four things:

1. Find the order by PaymentIntent, falling back to Stripe metadata when safe.
2. Reject unsafe ownership, stale attempt, terminal-order, and fencing-token conflicts into reconciliation.
3. Mark payment paid, advance fulfillment state, clear reconciliation state, and finalize reservation metadata.
4. Mark the checkout attempt complete after the order transaction commits.

Webhook and verification may race. Both call the same idempotent finalizer, so the first successful transaction wins and later calls early-exit from paid/fulfilled local state.

## Rollback Lifecycle

Rollback is only for unpaid, unfinished checkout work.

```text
pending unpaid order
  -> RECOVER_OR_RECONCILE
  -> paymentState failed/cancelled
  -> order cancelled
  -> inventory reservation released
  -> discount usage reverted
  -> cart restored when no newer checkout/cart exists
```

Rollback exits without mutation when the order is already paid, finalized, or cancelled.

## Reconciliation Flow

Reconciliation is for cases where automation cannot safely infer business intent.

Common cases:

- `paid_not_finalized`: Stripe succeeded, local finalization did not complete.
- `paid_cancelled`: Stripe succeeded after the order or attempt was cancelled.
- `mapping_mismatch`: Stripe metadata points at an order linked to a different PaymentIntent.
- `dangling_payment_intent`: Stripe payment exists but no local order mapping can be found.
- `fencing_token_mismatch`: Checkout ownership token does not match.
- `finalization_failure`: local finalization raised after payment success.

Operator action paths:

- Resolve or acknowledge when evidence proves the desired final state.
- Retry recovery only for paid-but-not-finalized cases.
- Start refund review when fulfillment is not intended.
- Escalate when raw Stripe/local documents disagree or evidence is incomplete.

## How Retries Converge

- Idempotency keys deduplicate checkout creation and PaymentIntent creation.
- Checkout attempts reject stale phase writes through expected-phase checks.
- Payment finalization early-exits from already paid and safely fulfilled orders.
- Fencing tokens prevent an older checkout attempt from winning after a newer one.
- Rollback skips cart restore when a newer attempt or non-empty cart exists.
- Reconciliation cases are keyed by PaymentIntent and reason, so repeated observations update one case instead of creating noise.

## Operating Notes

- Normal checkout completion should end with `paymentState=paid`, a non-cancelled fulfillment state, and `reconciliationState=none`.
- `status=reconciling` means fulfillment, cancellation, and refund workflows should stop until an operator resolves the case.
- Forensic timelines should be read from oldest to newest; the final row usually explains the current operator action.
- Prefer resolving from Stripe evidence plus local transition history. Avoid direct writes to checkout phase fields.

## Remaining Complexity To Watch

- The system still stores both workflow phases and operational phases. This is useful for diagnostics, but it should not grow additional parallel state vocabularies.
- Reconciliation classifications should remain few and operator-oriented. Add a new classification only when it changes routing or ownership.
- Chaos tests should prove convergence properties, not mirror every implementation branch.
