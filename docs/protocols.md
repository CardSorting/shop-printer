# Commerce Protocols — Unified Reference

Side-by-side view of the four frozen application protocols. Policy: [commerce-protocol-frozen.md](./commerce-protocol-frozen.md). Cheat sheet: [quick-reference.md](./quick-reference.md).

---

## At a glance

| | Checkout | Inventory | Refunds | Admin |
| --- | --- | --- | --- | --- |
| **Job** | Money capture | Stock movement | Money reversal | Human authority |
| **Container** | `services.checkout` | `services.inventory` | `services.refunds` | `services.admin` |
| **Interface** | `CheckoutApplicationService` | `InventoryApplicationService` | `RefundApplicationService` | `AdminApplicationService` |
| **Result** | `CheckoutResult<T>` | `InventoryResult<T>` | `RefundResult<T>` | `AdminResult<T>` |
| **Factory** | `createCheckoutStack()` | `createInventoryStack()` | `createRefundStack()` | `createAdminStack()` |
| **Internal engine** | `CheckoutMutationService`, `StripeService` | `InventoryMutationService` | `RefundService` | Delegates to above + `OrderService` |
| **Deep dive** | [checkout.md](./checkout.md) | [inventory.md](./inventory.md) | [refunds.md](./refunds.md) | [admin.md](./admin.md) |
| **Ladder test** | `checkout-verification-ladder` | `inventory-verification-ladder` | `refund-verification-ladder` | `admin-verification-ladder` |

---

## Public methods summary

### Checkout (`CheckoutApplicationService`)

| Method | Primary trigger |
| --- | --- |
| `createCheckoutSession` | Storefront checkout start |
| `recoverPendingOrder` | Success page verify |
| `handleCheckoutWebhook` | Stripe webhook |
| `completeCheckoutWithPaymentMethod` | Saved PM checkout |
| `cleanupExpiredPendingOrders` | System cron |
| `handleReconciliationOperatorAction` | Admin reconciliation |

### Inventory (`InventoryApplicationService`)

| Method | Primary trigger |
| --- | --- |
| `checkAvailability` | Cart add |
| `reserveInventory` | Checkout start |
| `confirmReservation` | Payment success |
| `releaseReservation` | Fail / cancel / cleanup |
| `adjustInventory` | Admin batch |
| `applyInventoryDeltas` | Refund restock, transfers |
| `receiveStockAtLocation` | PO receive |
| `reconcileInventory` | Admin reconcile |
| `cleanupExpiredReservations` | System cron |
| `getProductLedger` | Admin read |

### Refunds (`RefundApplicationService`)

| Method | Primary trigger |
| --- | --- |
| `createRefund` | Admin (via `requestRefund`) or Concierge |
| `getRefundStatus` | Admin read / idempotency recovery |

### Admin (`AdminApplicationService`) — selected

| Method | Delegates to |
| --- | --- |
| `requestRefund` | `refunds.createRefund` + operator log |
| `adjustInventory` (batch) | `inventory.adjustInventory` |
| `receivePurchaseOrder` | PO service → `receiveStockAtLocation` |
| `fulfillOrder`, `updateOrderStatus` | Authorized `OrderService` |
| `createProduct`, `updateProduct`, `archiveProduct` | Product admin |
| `resolveReconciliationCase` | Checkout operator path |

Full surface: `src/core/admin/adminApplicationService.ts`

---

## Interaction matrix

Who calls whom on a typical purchase + refund:

```text
Route create-payment-intent
  → checkout.createCheckoutSession
      → inventory.reserveInventory

Stripe webhook
  → checkout.handleCheckoutWebhook
      → inventory.confirmReservation

Admin refund
  → admin.requestRefund
      → refunds.createRefund
          → RefundService (internal)
              → inventory.applyInventoryDeltas (if restock)
```

Admin never skips `refunds` for money reversal. Checkout never skips `inventory` for stock holds.

---

## Idempotency by protocol

| Protocol | Claim storage | Typical key |
| --- | --- | --- |
| Checkout webhook | `stripe_webhook_events` | Stripe `event.id` |
| Checkout recovery | `checkout_recovery_attempts` | `recovery:{caseId}` |
| Refunds | `refund_execution_claims` | Client `idempotencyKey` |
| Admin mutations | `admin_mutation_claims` | Admin mutation key |
| Inventory | Ledger markers in `inventory_ledger` | Operation-specific prefix |

---

## Error handling contract

All protocols share the same **non-throwing public boundary**:

```typescript
type ProtocolResult<T> =
  | { ok: true; data: T; duplicate?: boolean }
  | { ok: false; code: string; message: string; retryable: boolean };
```

Route adapters map `code` → HTTP status. Callers must branch on `ok`, not try/catch for expected failures.

---

## Authorization model

| Protocol | Auth |
| --- | --- |
| Checkout | Session user + checkout lock |
| Inventory (checkout path) | Internal actor `'checkout'` |
| Inventory (admin path) | Admin session via route → admin protocol |
| Refunds (admin) | Elevated admin + reason |
| Refunds (concierge) | System actor + session policy + caps |
| Admin | Admin role; elevation for sensitive ops |

---

## Verification commands

```bash
npm run test:storefront-release   # storefront frozen chain (125 tests)
npm run test:e2e:checkout-smoke   # mocked checkout browser smoke (3 tests)

npm test -- --run \
  src/tests/checkout-verification-ladder.test.ts \
  src/tests/inventory-verification-ladder.test.ts \
  src/tests/inventory-location-consistency-ladder.test.ts \
  src/tests/refund-verification-ladder.test.ts \
  src/tests/admin-verification-ladder.test.ts
```

Detail: [testing.md](./testing.md) · [storefront-release.md](./storefront-release.md)

---

## When to touch each protocol

| Use case | Protocol |
| --- | --- |
| New payment finalization path | Checkout |
| New stock hold type | Inventory (+ checkout integration) |
| New refund channel (e.g. API partner) | Refunds (+ admin auth if human) |
| New operator bulk action | Admin → delegate to correct protocol |
| New product listing filter | Read layer — not a protocol |

Decision tree: [contributing-commerce.md](./contributing-commerce.md)

---

## Related

- [flows.md](./flows.md)
- [architecture.md](./architecture.md)
- [data-model.md](./data-model.md)
