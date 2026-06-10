# Quick Reference

One-page cheat sheet. Details in linked docs.

---

## Commerce runtime

```txt
checkout  = collect money      services.checkout
refunds   = reverse money      services.refunds
inventory = move stock         services.inventory
admin     = authorize ops      services.admin
crm       = customer truth     services.crm
support   = issue resolution   services.support
events    = committed memory   CommerceEventBus → commerce_events
timeline  = operator view      GET /api/admin/orders/:id/timeline
```

**Rule:** No route/tool calls `RefundService`, `OrderService`, or `InventoryService` for mutations.  
**Seal:** `src/tests/protocol-guard.test.ts`  
**Operator guide:** [operator-commerce-runtime.md](./operator-commerce-runtime.md)

---

## Checkout methods → routes

| Method | Route |
| --- | --- |
| `createCheckoutSession` | `POST /api/checkout/create-payment-intent` |
| `recoverPendingOrder` | `GET /api/checkout/verify` |
| `handleCheckoutWebhook` | `POST /api/webhooks/stripe` |
| `completeCheckoutWithPaymentMethod` | `POST /api/orders` |
| `cleanupExpiredPendingOrders` | `POST /api/system/cleanup-orders` |
| `handleReconciliationOperatorAction` | `POST /api/admin/reconciliation/cases` |

---

## Inventory methods → callers

| Method | Primary caller |
| --- | --- |
| `checkAvailability` | `CartService` |
| `reserveInventory` | Checkout mutation |
| `confirmReservation` | Checkout mutation |
| `releaseReservation` | Checkout / cleanup / admin |
| `adjustInventory` | Admin batch API |
| `receiveStockAtLocation` | `PurchaseOrderService` |
| `applyInventoryDeltas` | Refund, transfer, order admin |
| `reconcileInventory` | Admin reconcile API |
| `cleanupExpiredReservations` | System cleanup job |

---

## Refund entry points

| Caller | Path |
| --- | --- |
| Admin UI | `admin.requestRefund` → `refunds.createRefund({ source: 'admin' })` |
| Concierge | `refunds.createRefund({ source: 'concierge' })` |

Required: `orderId`, `amount`, `reason`, `idempotencyKey`, `actor`

---

## Result types

| Protocol | Type | Adapter |
| --- | --- | --- |
| Checkout | `CheckoutResult<T>` | `checkoutRouteAdapter.ts` |
| Inventory | `InventoryResult<T>` | `inventoryRouteAdapter.ts` |
| Refunds | `RefundResult<T>` | `refundRouteAdapter.ts` |
| Admin | `AdminResult<T>` | `adminRouteAdapter.ts` |

Shape: `{ ok: true, data }` or `{ ok: false, code, message, retryable }`

---

## Idempotency stores

| Domain | Collection |
| --- | --- |
| Stripe webhooks | `stripe_webhook_events` |
| Checkout recovery | `checkout_recovery_attempts` |
| Operator actions | `operator_action_events` |
| Refund claims | `refund_execution_claims` |
| Refund audit | `refund_execution_events` |
| Admin mutations | `admin_mutation_claims` |
| Inventory ledger | marker entries in `inventory_ledger` |

---

## Key env vars

| Variable | Required for |
| --- | --- |
| `SESSION_SECRET` | Signed cookies |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Server Firestore |
| `NEXT_PUBLIC_FIREBASE_*` | Client auth |
| `STRIPE_*` | Payments |
| `STRIPE_WEBHOOK_SECRET` | Webhook verify |
| `SYSTEM_JOB_TOKEN` | Cleanup cron routes |
| `GEMINI_API_KEY` | Concierge (optional) |

---

## Verification (fast)

```bash
npm test -- --run src/tests/checkout-verification-ladder.test.ts
npm test -- --run src/tests/inventory-verification-ladder.test.ts
npm test -- --run src/tests/refund-verification-ladder.test.ts
npm test -- --run src/tests/admin-verification-ladder.test.ts
```

---

## Dev shortcuts

| Task | Command / URL |
| --- | --- |
| Setup | `npm run setup` |
| Dev server | `npm run dev` |
| Stripe webhooks local | `stripe listen --forward-to localhost:3000/api/webhooks/stripe` |
| Admin login | `admin@woodbine.com` / `admin-password-123` (local only) |
| Test card | `4242 4242 4242 4242` |

---

## Doc index

| Need | Doc |
| --- | --- |
| First run | [onboarding.md](./onboarding.md) |
| Debug | [troubleshooting.md](./troubleshooting.md) |
| Flows | [flows.md](./flows.md) |
| Extend code | [contributing-commerce.md](./contributing-commerce.md) |
| All protocols | [protocols.md](./protocols.md) |
| Env vars | [environment-variables.md](./environment-variables.md) |
| Local dev | [local-development.md](./local-development.md) |
| Rebrand | [customization.md](./customization.md) |
| Release | [release-checklist.md](./release-checklist.md) |
| Terms | [glossary.md](./glossary.md) |
| Full index | [index.md](./index.md) |
