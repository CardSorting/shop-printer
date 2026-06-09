# Checkout Protocol — FROZEN

> Checkout is no longer route behavior. Checkout is an application protocol.

**Frozen as of:** 2026-06-09  
**Do not rename or re-broaden.** Harden contracts and observability only.

## Protocol shape

```txt
HTTP routes
  → CheckoutApplicationService
  → CheckoutResult<T>
  → checkoutRouteAdapter
  → structured logs / typed failures
```

## Public surface (`services.checkout`)

| Method | Success `data` | Failure codes |
|--------|----------------|---------------|
| `createCheckoutSession` | `CreateCheckoutSessionData` | `STRIPE_NOT_CONFIGURED`, `FORBIDDEN`, `SESSION_CREATE_FAILED`, `DOMAIN_ERROR`, `UNKNOWN` |
| `completeCheckoutWithPaymentMethod` | `Order` | `DOMAIN_ERROR`, `UNKNOWN` |
| `recoverPendingOrder` | `RecoverPendingOrderData` | `VERIFICATION_FAILED`, `RECOVERY_FAILED`, `STRIPE_NOT_CONFIGURED` |
| `handleCheckoutWebhook` | `HandleCheckoutWebhookData` | `WEBHOOK_*`, `STRIPE_NOT_CONFIGURED` |
| `handleReconciliationOperatorAction` | `HandleOperatorActionData` | `OPERATOR_*`, `OPERATOR_ACTION_FAILED` |
| `cleanupExpiredPendingOrders` | `CleanupExpiredPendingOrdersReport` | `STRIPE_NOT_CONFIGURED`, `CLEANUP_NOT_CONFIGURED` |

## Verification ladder (proof)

| # | Invariant | Proof |
|---|-----------|-------|
| 1 | Webhook duplicate does not double-mark paid | `checkout-verification-ladder.test.ts` — `confirmStripePayment` called once across duplicate events |
| 2 | `retry_recovery` duplicate does not double-run Stripe recovery | `checkout-verification-ladder.test.ts` — recovery idempotency via `operator_action_events` |
| 3 | Cleanup partial failure returns 207 report, not crash | `checkout-verification-ladder.test.ts` + cleanup route `checkoutPartialReportResponse` |
| 4 | Expected checkout failures → `CheckoutResult` error | Public methods return `ok: false`; no throw for configured-missing / operator / verification paths |
| 5 | Unexpected transient crash → `UNKNOWN` retryable → HTTP 503 | `checkoutFromError` + `checkoutRouteAdapter` |
| 6 | Logs include `orderId` / `caseId` / `stripeEventId` | `checkout_webhook_*`, `checkout_cleanup_*`, `checkout_recovery_attempt_duplicate`, `checkout_operator_action_duplicate` |
| 7 | Checkout protocol routes do not import `StripeService` or `OrderService` | `create-payment-intent`, `verify`, `webhooks/stripe`, `cleanup-orders` — checkout only; `orders` POST uses checkout; reconciliation POST mutates via checkout (GET read model uses `orderService` — admin read, not protocol) |
| 8 | No checkout public method throws for expected failure | `CheckoutFlowService` public API uses `checkoutOk` / `checkoutErr` / `checkoutTry` |

Run proof suite:

```bash
npm test -- --run src/tests/checkout-verification-ladder.test.ts \
  src/tests/checkout-flow-service.test.ts \
  src/tests/checkout-webhook-ingress.test.ts \
  src/tests/financial-recovery-hardening.test.ts \
  src/tests/webhook.test.ts \
  src/app/api/webhooks/stripe/route.test.ts \
  src/app/api/checkout/verify/route.test.ts \
  src/app/api/checkout/create-payment-intent/route.test.ts
```

## Layer boundaries (no ghosts)

| Symbol | Allowed layers |
|--------|----------------|
| `stripeService` | `container.ts` → stack injection only |
| `cancelExpiredPendingOrder` | stack injection → `checkoutCleanupFlow` |
| `recordOperatorAction` | stack injection → `checkoutOperatorFlow` |
| `retry_recovery` | `checkoutOperatorFlow`, `OrderAdminService` (case metadata) |
| `paymentIntentId` / `stripeEventId` / `reconciliationCaseId` | core flows, `OrderStripeIdentity` metadata — not route orchestration |

## Cleanup HTTP semantics

- **200** — all scanned orders processed without per-item failures in `report.errors` / `report.failed`
- **207** — `report.failed > 0` or `report.errors.length > 0` (partial success; job did not crash)
- **503/500** — stack misconfiguration or total failure (`CheckoutResult.ok === false`)
