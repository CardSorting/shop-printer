# Production Runbook

Operator and SRE procedures for a live MeowAcc store. Assumes [deployment.md](./deployment.md) is complete.

---

## Daily checks (5 min)

| Check | Action if bad |
| --- | --- |
| New orders finalizing to paid | If many **pending** with Stripe charges → [§ Stuck payments](#stuck-pending-orders) |
| Reconciliation queue empty or trending down | Open cases → [§ Reconciliation](#reconciliation-cases) |
| Cleanup job ran successfully | Schedule/fix cron → [§ Cleanup jobs](#cleanup-jobs) |
| Support ticket SLA | Normal ops — `/admin/tickets` |
| Stripe Dashboard errors | Webhook delivery failures → [troubleshooting.md](./troubleshooting.md) |

---

## Weekly checks (15 min)

| Check | Action |
| --- | --- |
| Inventory reconcile sample | `POST /api/admin/inventory/reconcile` or admin UI |
| Review audit log anomalies | `/admin/audit` |
| Verify backup exports (Firestore) | GCP Console |
| Rotate review — no secrets in logs | Security hygiene |
| Playwright or smoke checkout on prod | Optional synthetic monitor |

---

## Cleanup jobs

Expired checkout reservations and pending orders accumulate without scheduled cleanup.

### Endpoint

```bash
curl -X POST "https://YOUR_DOMAIN/api/system/cleanup-orders" \
  -H "Authorization: Bearer $SYSTEM_JOB_TOKEN" \
  -H "Content-Type: application/json"
```

### What it does

| Sub-job | Protocol | Effect |
| --- | --- | --- |
| Checkout cleanup | `cleanupExpiredPendingOrders` | Cancel unpaid expired pending; finalize paid; escalate reconciliation |
| Inventory cleanup | `cleanupExpiredReservations` | Release expired holds (batch limit 100) |

### Response codes

| HTTP | Meaning |
| --- | --- |
| 200 | All items processed cleanly |
| 207 | Partial failures — read `checkout.errors[]` / inventory errors |
| 401 | Wrong or missing `SYSTEM_JOB_TOKEN` |
| 503 | Stack misconfigured (Stripe, etc.) |

### Schedule recommendation

| Store volume | Frequency |
| --- | --- |
| Low | Daily off-peak |
| Active | Every 1–4 hours |
| High traffic | Hourly + alert on 207 |

Reservation-only job (optional):

```bash
curl -X POST "https://YOUR_DOMAIN/api/system/cleanup-inventory" \
  -H "Authorization: Bearer $SYSTEM_JOB_TOKEN"
```

---

## Stuck pending orders

**Symptom:** Stripe charge succeeded; order status still `pending`.

### Diagnosis

1. Stripe Dashboard → PaymentIntent → note `pi_…` id
2. Admin order detail → payment metadata
3. Stripe Dashboard → Webhooks → recent deliveries for `/api/webhooks/stripe`

### Fix path

| Cause | Fix |
| --- | --- |
| Webhook not configured | Add production endpoint + correct secret |
| Webhook failing 4xx/5xx | Fix server error; Stripe retries |
| One-off crash | Admin reconciliation → `retry_recovery` if `paid_not_finalized` |
| Customer on success page | They can hit verify URL; or operator recovery |

Never manually mark paid without understanding reconciliation state.

Flow: [flows.md § Reconciliation](./flows.md#reconciliation-flow-payment-mismatch)

---

## Reconciliation cases

| Reason code | Meaning | Safe operator action |
| --- | --- | --- |
| `paid_not_finalized` | Stripe paid; local not finalized | `retry_recovery` with reason |
| `paid_cancelled` | Paid after local cancel | Escalate — manual review |
| `mapping_mismatch` | PI points wrong order | Forensic timeline → fix mapping |
| `dangling_payment_intent` | PI without order | Investigate orphan |
| `fencing_token_mismatch` | Stale checkout attempt | Usually abandon or manual link |
| `finalization_failure` | Error after Stripe success | Retry recovery if eligible |

Operator API: `POST /api/admin/reconciliation/cases`  
Requires reason + actor. Idempotent per case.

---

## Refund incidents

| Symptom | Action |
| --- | --- |
| Double refund concern | Check `refund_execution_events` + Stripe Dashboard — same idempotency key should dedup |
| Refund succeeded; stock wrong | Review restock policy in refund path; manual inventory adjust with reason |
| Admin refund blocked | Operator needs elevation + reason |

Protocol: [refunds.md](./refunds.md)

---

## Inventory incidents

| Symptom | Action |
| --- | --- |
| Oversell | Check oversell reconciliation cases; do not PATCH product stock |
| PO receive partial failure | Retry with **same** idempotency key; check location exists |
| Catalog vs ledger drift | Run reconcile; investigate ledger for productId |
| Checkout says OOS but admin shows stock | Reservation may be holding — check expired reservations cleanup |

Protocol: [inventory.md](./inventory.md)

---

## Incident severity guide

| Severity | Example | Response |
| --- | --- | --- |
| **P1** | Checkout down; no new paid orders | Fix Stripe/Firebase; status page |
| **P1** | Webhooks 100% failing | Fix secret/routing immediately |
| **P2** | Elevated stuck pending count | Reconciliation + webhook fix |
| **P2** | Cleanup job failing 207 | Per-order errors in report |
| **P3** | Single order mismatch | Case-by-case recovery |
| **P3** | Stock count off one SKU | Adjust + reconcile |

---

## Log events to search

| Event | Indicates |
| --- | --- |
| `checkout_webhook_payment_succeeded` | Normal finalization |
| `checkout_cleanup_report` | Cleanup scan results |
| `checkout_recovery_attempt_duplicate` | Idempotent recovery (OK) |
| `system_cleanup_completed` | Scheduled job finished |
| `reconciliation_operator_action_retry_recovery_failed` | Recovery needs escalation |

Structured fields: `orderId`, `caseId`, `stripeEventId`, `paymentIntentId`

---

## Rollback vs recovery

| Situation | Do | Don't |
| --- | --- | --- |
| Bad deploy | Redeploy previous hosting release | Delete Firestore orders |
| Wrong refund | Stripe + support process | Bypass refund protocol |
| Stock miscount | Inventory adjust with idempotency key | Direct Firestore product edit |
| Payment mismatch | Reconciliation operator path | Manual `paid` flag without audit |

---

## Contacts and docs

| Need | Doc |
| --- | --- |
| Deploy | [deployment.md](./deployment.md) |
| Debug | [troubleshooting.md](./troubleshooting.md) |
| Flows | [flows.md](./flows.md) |
| Security incident | [security.md](./security.md) |
| Cheat sheet | [quick-reference.md](./quick-reference.md) |
