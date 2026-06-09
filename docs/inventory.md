# Inventory

> **Inventory is no longer scattered repo writes. Inventory is an application protocol.**

WoodBine inventory coordinates stock counts (cached truth), reservations (temporary claims), commits (final claims), and an append-only ledger (audit truth). Checkout, fulfillment, admin, and system jobs request protocol actions — they never mutate `product.stock` directly.

---

## 1. Protocol shape

Every inventory HTTP entry point follows the same stack:

```text
HTTP route
  → getServerServices().inventory       (InventoryApplicationService)
  → InventoryResult<T>                  (typed success or failure)
  → inventoryRouteAdapter               (maps to HTTP status + JSON body)
```

Internal orchestration (not imported by routes):

```text
InventoryFlowService
  → InventoryReservationService         (reservation lifecycle)
  → InventoryMutationService            (only path to productRepo.batchUpdateStock)
  → InventoryLedgerService              (append-only audit log)
  → IProductRepository                  (ProductCatalog / VariantStore)
  → IInventoryReservationRepository
  → IInventoryLedgerRepository
```

---

## 2. Construction

Single factory path — never wire mutation services directly in routes or tests (use `createInventoryStack()`).

```text
createInventoryApplication(productRepo, orderRepo?)
  → createInventoryStack({
       productRepo,
       ledgerRepo,              // FirestoreInventoryLedgerRepository
       reservationRepo,         // FirestoreInventoryReservationRepository
       reconciliationRepo,      // FirestoreInventoryReconciliationRepository
       onReservationReleased?,  // sync order.metadata.inventoryReservationReleased
     })
  → { inventory, mutations, reservations, ledger }
```

**Container export:** `services.inventory`

---

## 3. Public API

**Interface:** `InventoryApplicationService` (`src/core/inventory/inventoryApplicationService.ts`)  
**Implementation:** `InventoryFlowService` (`src/core/inventory/InventoryFlowService.ts`)

Every public method returns `InventoryResult<T>`. Expected failures never throw.

### Result contract

```ts
type InventoryResult<T> =
  | { ok: true; data: T; duplicate?: boolean }
  | { ok: false; code: InventoryErrorCode; message: string; retryable: boolean };
```

### Methods

| Method | Actor | When |
|--------|-------|------|
| `checkAvailability` | any | Pre-flight cart / admin validation |
| `reserveInventory` | checkout | Checkout created / payment pending |
| `confirmReservation` | checkout | Checkout paid |
| `releaseReservation` | checkout / admin / system | Cancelled, payment failed, expired |
| `adjustInventory` | admin | Absolute stock corrections (admin UI batch, product create) |
| `applyInventoryDeltas` | admin / fulfillment | Delta mutations (refund restock, transfers, swaps, PO receive) |
| `reconcileInventory` | system / admin | Ledger vs cached stock audit |
| `cleanupExpiredReservations` | system | Scheduled reservation expiry |

Checkout depends on `InventoryMutationBackend` (reserve / confirm / release only) — not the full service surface.

### Mutation containment (pass 3)

- Product `PATCH` rejects `stock` — use `POST /api/admin/inventory/batch`
- Product create sets initial stock via `adjustInventory` after catalog record is created at zero
- PO receiving increments catalog stock via `applyInventoryDeltas` in the same transaction as location levels
- `POST /api/system/cleanup-orders` runs checkout **and** inventory cleanup together

### Reservation states

```txt
available → reserved → committed
                    ↘ released / expired
                    ↘ oversold_review / reconciliation_required
```

---

## 4. Business flows

### Checkout

```text
checkout created/payment pending → reserveInventory()
checkout paid                 → confirmReservation()
checkout expired/cancelled    → releaseReservation()
payment failed                → releaseReservation()
```

Checkout passes `transaction` for reserve/confirm/release when inside the checkout Firestore transaction.

### Fulfillment / admin

```text
admin correction (absolute)   → adjustInventory()
refund restock / transfer     → applyInventoryDeltas()
scheduled cleanup             → cleanupExpiredReservations()
```

### Ledger

Every mutation creates an `InventoryLedgerEntry` with `idempotencyKey`. Stock count is derived/cached; ledger is audit truth.

---

## 5. HTTP routes

| Route | Protocol action |
|-------|-----------------|
| `POST /api/admin/inventory/batch` | `adjustInventory` |
| `POST /api/admin/inventory/reconcile` | `reconcileInventory` |
| `POST /api/system/cleanup-inventory` | `cleanupExpiredReservations` |
| `POST /api/system/cleanup-orders` | checkout cleanup + inventory cleanup |
| `GET /api/admin/inventory` | read-only overview (no mutation) |
| `GET /api/admin/inventory/ledger?productId=` | `getProductLedger` (audit read) |

Adapter: `src/infrastructure/server/inventoryRouteAdapter.ts`

---

## 6. Audit checklist

```txt
[x] No route writes inventory count directly
[x] Checkout calls only services.inventory.*
[x] Fulfillment restock uses applyInventoryDeltas
[x] Admin adjustments go through adjustInventory()
[x] Every mutation creates a ledger entry
[x] Every mutation has an idempotency key
[x] Reservations expire safely (cleanup job + release marker)
[x] Duplicate reserve/confirm/release/adjust/deltas do not double-mutate
[x] Partial cleanup returns structured report (207 on partial failure)
[x] InventoryResult<T> maps cleanly to HTTP
[x] Oversell creates reconciliation case, not silent corruption
[x] Firestore product repo rejects direct stock writes (update / batchSetInventory / updateStock)
[x] Cart add/update calls checkAvailability for physical items
[x] Seed loader creates products at stock 0 then writes ledger-aligned initial stock
[x] Admin bulk stock edits send client idempotency keys
[x] PO receiving uses receiveStockAtLocation (catalog + location in one protocol call)
[x] receiveStockAtLocation idempotency prevents duplicate PO receive
[x] Location receive failure rolls back catalog when not transactional
[x] Ledger records productId / locationId / purchaseOrderId on location_receive
```

---

## 9. Movement protocol (not a stock counter)

Inventory is no longer a stock counter. Inventory is a **movement protocol**.

| Movement | Protocol action |
|----------|-----------------|
| PO receiving | `receiveStockAtLocation` — one call fans out to catalog + location + ledger |
| Checkout hold | `reserveInventory` |
| Payment commit | `confirmReservation` |
| Admin correction | `adjustInventory` |
| Refund / transfer restock | `applyInventoryDeltas` |

`receiveStockAtLocation` writes:
- catalog deltas via internal `applyInventoryDeltas`
- location `availableQty` adjustments
- ledger lines with `productId`, `locationId`, `purchaseOrderId`, and a top-level receive marker for idempotency

Proof ladder: `src/tests/inventory-location-consistency-ladder.test.ts`

---

## 7. Seeding (Admin SDK exception)

`SeedDataLoader` bypasses the runtime container but mirrors protocol semantics:

1. Product documents are written with `stock: 0`
2. `seedCatalogStockAdmin()` applies the target stock and writes delta + marker ledger entries
3. Digital / non-tracked products skip stock bootstrap

Re-running seed is safe: duplicate marker keys are ignored.

---

## 8. One construction path

- **Production:** `getInitialServices().inventory`
- **Tests:** `createOrderTestStack()` or `createInventoryStack()` with in-memory repos
- **Never:** `productRepo.batchUpdateStock()` outside `InventoryMutationService`
