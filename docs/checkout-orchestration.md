# Checkout Orchestration

> **FROZEN.** See [checkout-protocol-frozen.md](./checkout-protocol-frozen.md) for the sealed application protocol and verification ladder.

Checkout is a monolith-local workflow. It coordinates cart reservation, order creation, Stripe PaymentIntent creation, payment finalization, rollback, reconciliation, and operator recovery without introducing distributed infrastructure.

## Entry Point

```text
Routes / UI / webhooks
  -> getServerServices().checkout   (CheckoutApplicationService)
       -> createCheckoutStack() -> CheckoutFlowService
            -> checkoutClientStartFlow / checkoutPaymentMethodFlow / checkoutWebhookIngressFlow
            -> CheckoutMutationService (CheckoutMutationBackend — internal)
            -> checkoutOrderResolver / checkoutPaymentIntentFlow / checkoutVerifyFlow
            -> checkoutOrderState / checkoutEventLog
```

`OrderService` has no checkout dependency. Routes never pass `stripeService`, cancellation callbacks, or operator-action recorders — those are injected when the stack is built.

## Public API (`CheckoutApplicationService`)

Every public method returns `CheckoutResult<T>`:

```ts
type CheckoutResult<T> =
  | { ok: true; data: T; duplicate?: boolean }
  | { ok: false; code: CheckoutErrorCode; message: string; retryable: boolean };
```

| Method | Used by | Success data |
|--------|---------|--------------|
| `createCheckoutSession` | `POST /api/checkout/create-payment-intent` | `CreateCheckoutSessionData` |
| `completeCheckoutWithPaymentMethod` | `POST /api/orders` | `Order` |
| `recoverPendingOrder` | `GET /api/checkout/verify` | `RecoverPendingOrderData` |
| `handleCheckoutWebhook` | `POST /api/webhooks/stripe` | `HandleCheckoutWebhookData` |
| `handleReconciliationOperatorAction` | `POST /api/admin/reconciliation/cases` | `HandleOperatorActionData` |
| `cleanupExpiredPendingOrders` | `POST /api/system/cleanup-orders` | `CleanupExpiredPendingOrdersReport` |

Routes map failures via `checkoutRouteAdapter.ts`. Internal-only (tests/benchmarks): `reserveCheckout`, `confirmPaymentFromStripe`, `resolveOrder`, etc.

### Cleanup report shape

```ts
{
  scanned: number;
  expired: number;
  cancelled: number;
  failed: number;
  errors: CheckoutCleanupError[];
}
```

## Stack Dependencies (injected at construction)

- `stripe` — PaymentIntent create/lookup + webhook ingress (single instance from container)
- `eventLog` — `checkout_recovery_attempts`, `operator_action_events` idempotency
- `cancelExpiredPendingOrder` — wired from `OrderService` admin path
- `recordOperatorAction` — wired from `OrderService` reconciliation admin path
- `checkoutGateway` — optional `TrustedCheckoutGateway` when `CHECKOUT_ENDPOINT` is set

## Responsibilities

- `CheckoutFlowService` implements `CheckoutApplicationService` — the **only** checkout boundary for routes.
- `CheckoutMutationService` implements `CheckoutMutationBackend` (`runCheckoutReservation`, `confirmStripePayment`, `rollbackUnpaidCheckout`) — internal only.
- `checkoutWebhookIngressFlow.ts` — verify signature, dedupe Stripe event id, process, ack.
- `checkoutEventLog.ts` — recovery and operator-action idempotency stores.
- `checkoutOrderState.ts` — explicit checkout order states (`pending_payment` → `checkout_session_created` → `paid` → `recovered` / `cancelled` / `reconciliation_required`).
- `OrderStripeIdentity` on `Order` — tracks `orderId`, `paymentIntentId`, `lastStripeEventId`, `reconciliationCaseId`.
- `OrderAdminService` owns reconciliation case summaries, forensic timeline reads (read-only from routes).

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

Checkout order state (metadata `checkoutOrderState`):

```text
pending_payment -> checkout_session_created -> paid -> recovered -> resolved
                              |-> payment_failed -> recovery_pending
                              |-> expired -> cancelled
                              |-> reconciliation_required -> resolved
```

## Webhook Ingress

```text
verify signature
  -> claim Stripe event id (stripe_webhook_events)
  -> if duplicate completed: ack fast
  -> if in-flight: 503 retry
  -> CheckoutFlowService confirms or reconciles
  -> mark event completed
```

## Idempotency

- Stripe webhook events: `stripe_webhook_events` collection (via `StripeService`)
- Recovery retries: `checkout_recovery_attempts` (via `FirestoreCheckoutEventLog`)
- Operator actions: `operator_action_events` (via `FirestoreCheckoutEventLog`)

## Audit Checklist

```text
[x] No route imports OrderCheckoutService
[x] No route calls orderService cancellation for checkout
[x] No route branches on retry_recovery
[x] No route passes stripeService into checkout methods
[x] One StripeService instance in container
[x] CheckoutFlowService owns recovery
[x] CheckoutFlowService owns cleanup
[x] Webhooks dedupe by Stripe event id
[x] Recovery dedupes by case/action
[x] Stripe identity tracked on order metadata
[x] Docs say CheckoutApplicationService is the only checkout public API
[x] Tests cover duplicate webhook, duplicate retry_recovery, expired cleanup
```
