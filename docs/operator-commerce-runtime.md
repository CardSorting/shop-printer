# Operator Commerce Runtime

Quick reference for operating DreamBees Art as a **commerce runtime**, not a route-driven clone.

```txt
protocols = authority
events    = memory
timeline  = observability
laws      = constitution
```

**State changes happen first. Events describe only committed reality.**

Constitution: [commerce-protocol-laws.md](./commerce-protocol-laws.md)

---

## What each protocol does

| Protocol | Job | Service | Mutates |
| --- | --- | --- | --- |
| **Checkout** | Collect money | `services.checkout` | Orders, payment state, checkout attempts |
| **Refunds** | Reverse money | `services.refunds` | Refund records, order payment state |
| **Inventory** | Move stock | `services.inventory` | Reservations, ledger, catalog stock |
| **Admin** | Authorize operations | `services.admin` | Orders, products, POs, locations, roles |
| **CRM** | Customer truth | `services.crm` | Customer profiles, segments |
| **Support** | Issue resolution | `services.support` | Tickets, messages, macros |

| Layer | Job | Where |
| --- | --- | --- |
| **Events** | Committed memory | `commerce_events` via `CommerceEventBus` |
| **Timeline** | Operator view | `GET /api/admin/orders/:id/timeline` |

---

## How to think about an order

1. **Checkout** creates the order and reserves inventory inside a Firestore transaction.
2. After commit, **inventory events** fan out (`inventory.reserved`, `inventory.committed`, `inventory.released`).
3. **Payment confirmation** publishes `checkout.payment_confirmed`.
4. **Timeline** merges checkout + inventory + refund + support events by `relatedOrderId` / `correlationId`.

Do not infer stock or payment truth from UI labels alone — check protocol state and the event stream.

---

## Operator entry points

| Task | Where | Protocol |
| --- | --- | --- |
| Review order | `/admin/orders/[id]` | `adminOrdersApi.getOrder` + `getTimeline` |
| Change status / fulfill | Order detail actions | `services.admin` |
| Issue refund | Order detail or refund flow | `services.admin.requestRefund` → `services.refunds` |
| Adjust stock | `/admin/inventory` | `services.admin.adjustInventory` |
| Receive PO | `/admin/purchase-orders/[id]/receive` | `services.admin.receivePurchaseOrder` |
| Reconcile checkout | `/admin/reconciliation` | `services.checkout` + admin |
| Support ticket | `/admin/tickets` | `services.support` |
| Customer edit | `/admin/customers` | `services.crm` |

Concierge autonomous tools use the same protocols (`services.admin`, `services.refunds`, `services.support`) — never legacy `OrderService` mutations.

---

## Canonical statuses

### Orders

Use statuses from the domain model (`pending`, `confirmed`, `processing`, `shipped`, `cancelled`, `refunded`, etc.). Routes parse via `parseOrderStatus` at the boundary.

### Support tickets

Canonical: `new`, `open`, `pending_customer`, `pending_internal`, `resolved`, `closed`, `reopened`.

Legacy strings (`pending`, `on_hold`, `solved`) are normalized at API parsers — do not write them from new UI or integrations.

---

## What routes must never do

- Import `RefundService`, `OrderService`, or `InventoryService`
- Import Firestore commerce repositories
- Call `productRepo.batchUpdateStock` or `refundService.processRefund`
- Mutate inventory outside `services.inventory` / `services.admin`

Enforced by `src/tests/protocol-guard.test.ts`.

---

## Debugging keys

| Key | Use |
| --- | --- |
| `orderId` | Primary entity |
| `correlationId` | Usually `order:{orderId}` across protocols |
| `idempotencyKey` | Retry safety — duplicate requests must not double-apply |
| `checkoutAttemptId` | Checkout phase tracing |
| `paymentIntentId` | Stripe ↔ local mapping |

---

## Related docs

- [commerce-incident-runbook.md](./commerce-incident-runbook.md) — incident response
- [checkout.md](./checkout.md) — money capture protocol
- [inventory.md](./inventory.md) — stock protocol
- [refunds.md](./refunds.md) — reversal protocol
- [quick-reference.md](./quick-reference.md) — method ↔ route cheat sheet
- [runbook.md](./runbook.md) — production cadence
