# Commerce Incident Runbook

Operator procedures when checkout, inventory, refunds, or support behave unexpectedly.

**Runtime model:** [operator-commerce-runtime.md](./operator-commerce-runtime.md)  
**General production cadence:** [runbook.md](./runbook.md)

---

## First 60 seconds

1. `GET /api/system/health/protocols` — note which check is `degraded` or `failed`.
2. Capture `orderId`, `paymentIntentId`, `checkoutAttemptId`, and timestamp.
3. Open order timeline: `GET /api/admin/orders/:id/timeline` (or order detail Commerce Timeline UI).
4. Check Stripe Dashboard for PaymentIntent status and webhook delivery.
5. Do **not** manually edit Firestore order/inventory documents — use protocol entry points.

---

## Symptom → protocol map

| Symptom | Likely protocol | First check |
| --- | --- | --- |
| Customer charged, order still `pending` | Checkout | Timeline for `checkout.payment_confirmed`; webhook logs |
| Stock wrong after checkout | Inventory | Ledger + `inventory.reserved` / `inventory.committed` events |
| Refund stuck or duplicate | Refunds | `idempotencyKey` on refund request; `refund.created` event |
| Ticket status looks wrong in UI | Support | Canonical status vs legacy string at API boundary |
| PO received but stock unchanged | Admin + Inventory | `services.admin.receivePurchaseOrder` result; ledger |
| Concierge action failed | Admin | Concierge uses `services.admin` — check `AdminResult` code |

---

## Stuck pending order (paid in Stripe)

```txt
1. Timeline: missing checkout.payment_confirmed?
2. Webhook: POST /api/webhooks/stripe delivered?
3. Reconciliation queue: /admin/reconciliation
4. Operator action: retry_recovery via checkout protocol (not direct order patch)
```

See [checkout.md § When things go wrong](./checkout.md) and [troubleshooting.md](./troubleshooting.md).

**Never:** set `paymentState: paid` in Firestore manually.

---

## Inventory mismatch

```txt
1. GET product ledger: /api/admin/inventory/ledger?productId=...
2. Compare reservation metadata on order (inventoryReserved, inventoryReservationFinalized)
3. POST /api/admin/inventory/reconcile for drift report
4. Adjust only via services.admin.adjustInventory or protocol receive paths
```

Post-commit rule: inventory commerce events appear **only after** the Firestore transaction commits. A failed transaction produces **zero** inventory events.

---

## Refund incident

```txt
1. Confirm prior checkout event exists for order
2. Use services.refunds / admin.requestRefund with fresh idempotencyKey
3. Check commerce_events for refund.created
4. If processor error: note retryable flag on RefundResult (503 vs 400)
```

**Never:** call `RefundService.processRefund` from routes or tools.

---

## Reconciliation case open

When payment succeeded after terminal order state, or mapping mismatch:

1. Open case in `/admin/reconciliation`
2. Gather timeline + Stripe evidence
3. Resolve via `services.checkout.handleReconciliationOperatorAction` or admin reconcile flow
4. Document reason in operator event log

---

## Support ticket status confusion

Canonical statuses only in new work:

```txt
new | open | pending_customer | pending_internal | resolved | closed | reopened
```

If integrations send `pending`, `on_hold`, or `solved`, parsers normalize at the API boundary. Fix the sender; do not fork status logic in UI.

---

## Cleanup jobs failed

```bash
curl -X POST "https://YOUR_DOMAIN/api/system/cleanup-orders" \
  -H "Authorization: Bearer $SYSTEM_JOB_TOKEN"

curl -X POST "https://YOUR_DOMAIN/api/system/cleanup-inventory" \
  -H "Authorization: Bearer $SYSTEM_JOB_TOKEN"
```

Both call `services.inventory.cleanupExpiredReservations` through protocol adapters.

---

## Escalation checklist

Before engineering escalation, attach:

- [ ] `orderId` and `correlationId`
- [ ] Timeline export (or ordered event types + `occurredAt`)
- [ ] Stripe PaymentIntent id + status
- [ ] Last successful protocol mutation + `idempotencyKey`
- [ ] Whether a Firestore transaction may have rolled back (inventory events absent)

---

## Protocol health degraded

| Failed check | Likely cause | Fix |
| --- | --- | --- |
| `stripe` | Missing `STRIPE_SECRET_KEY` or `STRIPE_WEBHOOK_SECRET` | Set env vars; redeploy |
| `firestore` | Bad `FIREBASE_SERVICE_ACCOUNT_JSON` or project mismatch | Fix credentials / project ID |
| `commerceEvents` | `commerce_events` collection unreachable | Firestore rules, indexes, IAM |
| `checkout` / `refunds` | Stripe unhealthy or protocol not wired | Fix Stripe first |
| `inventory` / `support` / `crm` | Firestore unhealthy | Fix Firestore first |

Readiness detail: [production-readiness.md](./production-readiness.md)

---

## Verification after fix

```bash
curl -sS https://YOUR_DOMAIN/api/system/health/protocols
npm test -- --run src/tests/protocol-guard.test.ts
npm test -- --run src/tests/production-readiness.test.ts
npm test -- --run src/tests/*-verification-ladder.test.ts
```

Protocol guard must stay green — new bypass paths are regressions, not hotfixes.
