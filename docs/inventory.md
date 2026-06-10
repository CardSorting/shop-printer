# Inventory

> **Inventory is a movement protocol — not a stock counter.**

DreamBees Art inventory coordinates **cached stock counts** (sellable catalog truth), **location levels** (warehouse truth), **reservations** (checkout holds), **commits** (post-payment), and an **append-only ledger** (audit truth). It is the **stock movement** boundary for this open-source ecommerce platform (Shopify inventory analogue, with explicit ledger and reconciliation).

Routes, checkout, fulfillment, admin, and system jobs call `services.inventory` only — never `productRepo.batchUpdateStock` directly.

Policy: [commerce-protocol-frozen.md](./commerce-protocol-frozen.md) · Platform context: [platform-overview.md](./platform-overview.md)

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
  → InventoryReservationService         (reservation lifecycle + oversell cases)
  → InventoryMutationService            (only path to productRepo.batchUpdateStock)
  → InventoryLedgerService              (append-only audit log)
  → IProductRepository                  (ProductCatalog / VariantStore)
  → IInventoryLevelRepository?          (location availableQty — PO receive fan-out)
  → IInventoryReservationRepository
  → IInventoryLedgerRepository
  → IInventoryReconciliationRepository
```

Checkout depends on **`InventoryMutationBackend`** (reserve / confirm / release only) — not the full service surface.

---

## 2. Construction

Single factory path — never wire `InventoryMutationService` directly in routes or tests (use `createInventoryStack()`).

```text
createInventoryApplication(productRepo, orderRepo?, inventoryLevelRepo?)
  → createInventoryStack({
       productRepo,
       ledgerRepo,              // FirestoreInventoryLedgerRepository
       reservationRepo,         // FirestoreInventoryReservationRepository
       reconciliationRepo,      // FirestoreInventoryReconciliationRepository
       inventoryLevelRepo?,     // FirestoreInventoryLevelRepository (required for PO receive)
       onReservationReleased?,  // sync order.metadata.inventoryReservationReleased
     })
  → { inventory, mutations, reservations, ledger }
```

| Dependency | Source | Used for |
|------------|--------|----------|
| `productRepo` | Firestore | Cached catalog stock (`batchUpdateStock` internal only) |
| `ledgerRepo` | Firestore | Append-only movement audit |
| `reservationRepo` | Firestore | Checkout holds |
| `reconciliationRepo` | Firestore | Oversell / ledger discrepancy cases |
| `inventoryLevelRepo` | Firestore | Location `availableQty` fan-out from `receiveStockAtLocation` |
| `onReservationReleased` | Container hook | Order metadata sync after release |

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

Helpers: `inventoryOk`, `inventoryErr`, `inventoryTry`, `inventoryFromError` in `src/core/inventory/inventoryResult.ts`.

### Methods

#### `checkAvailability`

Pre-flight stock validation without mutation.

| | |
|---|---|
| **Callers** | `CartService` (add/update for physical items) |
| **Input** | `{ items: InventoryLineItem[] }` |
| **Success data** | `{ available, lines[] }` per product/variant |
| **Typical errors** | none (returns `available: false` in success data) |

Skips digital products and products with `continueSellingWhenOutOfStock`.

#### `reserveInventory`

Temporary stock claim during checkout.

| | |
|---|---|
| **Callers** | `CheckoutMutationService` via `InventoryMutationBackend` |
| **Input** | `orderId`, `items`, `idempotencyKey`, `actor: 'checkout'`, optional `transaction` |
| **Success data** | `{ reservationId, orderId, state: 'reserved', expiresAt, lines }` |
| **Typical errors** | `INSUFFICIENT_STOCK`, `INVALID_INPUT` |

Decrements cached catalog stock and writes ledger entries (`reservation_created`). Oversell during mutation creates an oversell reconciliation case — never silent double-sell.

#### `confirmReservation`

Finalizes a hold after payment.

| | |
|---|---|
| **Callers** | `CheckoutMutationService` |
| **Input** | `orderId` or `reservationId`, `idempotencyKey`, `actor: 'checkout'`, optional `transaction` |
| **Success data** | `{ reservationId, orderId, state: 'committed' }` |
| **Typical errors** | `RESERVATION_NOT_FOUND`, `RESERVATION_INVALID_STATE` |

Does not change stock again — reservation already decremented catalog count.

#### `releaseReservation`

Restores stock from a cancelled/expired/failed checkout.

| | |
|---|---|
| **Callers** | `CheckoutMutationService`, `OrderAdminService`, cleanup jobs |
| **Input** | `orderId` or `reservationId`, `idempotencyKey`, `actor`, optional `reason`, `transaction` |
| **Success data** | `{ reservationId, orderId, state: 'released' \| 'expired', restoredLines }` |
| **Typical errors** | `RESERVATION_NOT_FOUND`, `RESERVATION_INVALID_STATE` |

Idempotent via ledger release marker. Container hook syncs `order.metadata.inventoryReservationReleased`.

#### `adjustInventory`

Absolute stock corrections (admin set-to-N).

| | |
|---|---|
| **Route** | `POST /api/admin/inventory/batch` |
| **Callers** | `ProductService` (create/update/batch admin), `OperationsRuntimeService` |
| **Input** | `updates[]`, `idempotencyKey`, `actor: 'admin'`, optional `note`, `transaction` |
| **Success data** | `{ adjustments[] }` with previous/new/delta per line |
| **Typical errors** | `INVALID_INPUT`, `INSUFFICIENT_STOCK` (negative delta path) |

Writes delta ledger entries + adjust marker for idempotency.

#### `applyInventoryDeltas`

Relative stock mutations (delta +/- N).

| | |
|---|---|
| **Callers** | `RefundService`, `TransferService`, `OrderAdminService` (swap/restock) |
| **Input** | `deltas[]`, `idempotencyKey`, `actor`, `reason`, optional `purchaseOrderId`, `transaction` |
| **Success data** | `{ applied[] }` |
| **Typical errors** | `INSUFFICIENT_STOCK`, `INVALID_INPUT` |

**Not** called directly by `PurchaseOrderService` — PO receiving uses `receiveStockAtLocation` instead.

#### `receiveStockAtLocation`

**Single movement action** for PO receiving — fans out catalog + location + ledger internally.

| | |
|---|---|
| **Callers** | `PurchaseOrderService.receiveItems` only |
| **Input** | `items[]` (productId, locationId, delta), `idempotencyKey`, `actor`, `reason: 'location_receive'`, optional `purchaseOrderId`, `locationReason`, `transaction` |
| **Success data** | `{ catalog: { applied[] }, locations[] }` |
| **Typical errors** | `LOCATION_RECEIVE_FAILED` (503 retryable), catalog errors from inner `applyInventoryDeltas` |

```text
receiveStockAtLocation(idempotencyKey)
  → check receive marker (duplicate → ok + duplicate)
  → applyInventoryDeltas (catalog stock + catalog ledger)
  → for each line: inventoryLevelRepo.adjustQuantity (location stock)
  → append per-line ledger (productId, locationId, purchaseOrderId)
  → append receive marker (delta 0)
```

On location failure **without** an outer transaction: catalog is rolled back via inverse deltas and `LOCATION_RECEIVE_FAILED` is returned. With an outer Firestore transaction (PO receive): error propagates and the transaction rolls back atomically.

#### `reconcileInventory`

Scans cached stock vs ledger balance; opens reconciliation cases on discrepancy.

| | |
|---|---|
| **Route** | `POST /api/admin/inventory/reconcile` |
| **Input** | optional `productIds[]`, `actor` |
| **Success data** | `{ scanned, discrepancies[] }` |

#### `cleanupExpiredReservations`

Releases expired reservations in batch with structured partial-failure report.

| | |
|---|---|
| **Routes** | `POST /api/system/cleanup-inventory`, `POST /api/system/cleanup-orders` |
| **Input** | optional `before`, `limit` |
| **Success data** | `{ scanned, expired, released, failed, errors[] }` |
| **HTTP** | 207 when `failed > 0` (via `inventoryPartialReportResponse`) |

#### `getProductLedger`

Read-only audit trail for a product.

| | |
|---|---|
| **Route** | `GET /api/admin/inventory/ledger?productId=&limit=` |
| **Input** | `productId`, optional `limit` (1–500) |
| **Success data** | `{ productId, entries[] }` |
| **Typical errors** | `PRODUCT_NOT_FOUND`, `INVALID_INPUT` |

---

## 4. Error codes and HTTP mapping

| Code | HTTP | When |
|------|------|------|
| `INSUFFICIENT_STOCK` | 409 | Reserve/adjust/delta would oversell |
| `PRODUCT_NOT_FOUND` | 404 | Ledger read for missing product |
| `RESERVATION_NOT_FOUND` | 404 | Confirm/release target missing |
| `RESERVATION_INVALID_STATE` | 409 | Confirm/release on terminal reservation |
| `RECONCILIATION_REQUIRED` | 409 | Ledger vs stock mismatch detected |
| `LOCATION_RECEIVE_FAILED` | 503 | PO location fan-out failed; catalog rolled back (non-txn) |
| `OVERSELL_DETECTED` | 409 | Oversell case opened |
| `INVALID_INPUT` | 400 | Missing keys, empty payloads, stack misconfiguration |
| `DOMAIN_ERROR` | 422 | Domain validation surfaced through protocol |
| `UNKNOWN` (retryable) | 503 | Transient external failure |
| `UNKNOWN` (non-retryable) | 500 | Unexpected error |

Error response body: `{ error, code, retryable }`.  
Adapter: `src/infrastructure/server/inventoryRouteAdapter.ts`

Duplicate successful operations return `{ duplicate: true }` in the success payload (batch route includes `duplicate` field).

---

## 5. Route inventory

Inventory protocol routes call **only** `services.inventory`:

| Route | Method | Inventory API |
|-------|--------|---------------|
| `/api/admin/inventory/batch` | POST | `adjustInventory` |
| `/api/admin/inventory/reconcile` | POST | `reconcileInventory` |
| `/api/admin/inventory/ledger` | GET | `getProductLedger` |
| `/api/system/cleanup-inventory` | POST | `cleanupExpiredReservations` |
| `/api/system/cleanup-orders` | POST | checkout cleanup + `cleanupExpiredReservations` |

**Read-only (no mutation):**

| Route | Purpose |
|-------|---------|
| `GET /api/admin/inventory` | Inventory overview via `ProductService.getInventoryOverview` |

**Forbidden in inventory protocol routes:**

- Import or call `IProductRepository.batchUpdateStock`, `updateStock`, or `batchSetInventory`
- Write `stock` on product PATCH (rejected by `parseProductUpdate`)
- Call `applyInventoryDeltas` from PO receiving routes (use `PurchaseOrderService` → `receiveStockAtLocation`)

### Core caller matrix

| Service | Protocol methods |
|---------|------------------|
| `CheckoutMutationService` | `reserveInventory`, `confirmReservation`, `releaseReservation` |
| `CartService` | `checkAvailability` |
| `ProductService` | `adjustInventory` |
| `PurchaseOrderService` | `receiveStockAtLocation` |
| `RefundService` | `applyInventoryDeltas` |
| `TransferService` | `applyInventoryDeltas` |
| `OrderAdminService` | `applyInventoryDeltas`, `releaseReservation` |
| `OperationsRuntimeService` | `adjustInventory` |

Admin UI (`AdminInventory.tsx`) delegates to `POST /api/admin/inventory/batch` with client-generated idempotency keys — never repo writes.

---

## 6. Business flows

### Checkout reservation lifecycle

```text
cart validated (checkAvailability)
  → order created
  → reserveInventory()           catalog stock -= qty, reservation = reserved
  → payment succeeds
  → confirmReservation()         reservation = committed (no second stock decrement)
  → payment fails / cancel / expire
  → releaseReservation()         catalog stock restored, reservation = released
```

Checkout passes `transaction` for reserve/confirm/release when inside the checkout Firestore transaction.

### PO receiving (movement protocol)

```text
PurchaseOrderService.receiveItems
  → receiveStockAtLocation (single protocol call)
       → catalog delta (+ ledger: productId, purchaseOrderId)
       → location availableQty (+ ledger: productId, locationId, purchaseOrderId)
       → receive marker (idempotency)
```

Duplicate receive with the same `idempotencyKey` returns `{ duplicate: true }` without double-adding catalog or location stock.

### Admin correction

```text
AdminInventory bulk save
  → POST /api/admin/inventory/batch (client idempotencyKey)
  → adjustInventory (absolute stock targets)
```

Product create: catalog record at `stock: 0`, then `adjustInventory` for initial quantity.

### Refund / transfer restock

```text
RefundService / TransferService / OrderAdminService
  → applyInventoryDeltas (relative +/- with idempotency marker)
```

---

## 7. State machines

### Reservation states

```text
(reservation created)
  → reserved
  → committed          (payment confirmed)
  → released | expired  (cancel / cleanup / rollback)
  → oversold_review      (mutation conflict — reconciliation case opened)
```

### Catalog vs location truth

| Store | Collection | Meaning | Mutated by |
|-------|------------|---------|------------|
| Catalog stock | `products.stock` | Sellable count (checkout, storefront) | `InventoryMutationService` only |
| Location level | `inventory_levels.availableQty` | Warehouse/location ops | `receiveStockAtLocation` fan-out |
| Ledger | `inventory_ledger` | Audit truth | Every protocol mutation |

PO receiving is the primary path that updates **both** catalog and location in one sealed action. Checkout reservations affect **catalog** only.

---

## 8. Ledger

Every mutation creates an `InventoryLedgerEntry`. Stock counts are derived/cached; ledger is audit truth.

```ts
interface InventoryLedgerEntry {
  id: string;
  productId: string;
  variantId?: string;
  locationId?: string;        // present on location_receive line entries
  purchaseOrderId?: string;   // present on PO receive entries
  reservationId?: string;
  orderId?: string;
  delta: number;
  reason: InventoryLedgerReason;
  actor: InventoryActor;
  idempotencyKey: string;
  createdAt: string;
}
```

### Ledger reasons

| Reason | Meaning |
|--------|---------|
| `reservation_created` | Checkout hold decrements stock |
| `reservation_confirmed` | Payment commit marker (delta 0) |
| `reservation_released` | Hold restored |
| `reservation_expired` | Cleanup expiry |
| `admin_adjustment` | Admin absolute correction |
| `reconciliation` | Refund/swap restock |
| `location_receive` | PO receive (catalog + location movement) |

---

## 9. Idempotency

| Operation | Marker key pattern | Duplicate behavior |
|-----------|-------------------|-------------------|
| Reserve | reservation idempotency key | Returns existing reservation |
| Confirm | `confirm:{idempotencyKey}` | Returns committed state |
| Release | release marker + reservation lookup | No double-restore |
| Adjust | `adjust:{idempotencyKey}` | No double-apply |
| Deltas | `deltas:{idempotencyKey}` | No double-apply |
| PO receive | `receive:{idempotencyKey}` | No catalog/location double-add |
| PO receive catalog | `receive-catalog:{idempotencyKey}` | Inner catalog idempotency |
| PO receive line | `receive:…:line:{productId}:{locationId}` | Per-line ledger dedup |

Admin bulk edits send a client `crypto.randomUUID()` idempotency key from `AdminInventory.tsx`.

---

## 10. Defense in depth

### Firestore product repository guards

Direct stock writes throw at the infrastructure layer:

- `update()` / `batchUpdate()` reject `stock` and `_variantStockUpdate`
- `updateStock()`, `updateVariantStock()`, `batchSetInventory()` throw with protocol message
- `batchUpdateStock()` remains **internal** — `InventoryMutationService` only

### Product PATCH

`parseProductUpdate` rejects `stock` on product PATCH — use `POST /api/admin/inventory/batch`.

### Seeding (Admin SDK exception)

`SeedDataLoader` bypasses the runtime container but mirrors protocol semantics:

1. Product documents written with `stock: 0`
2. `seedCatalogStockAdmin()` applies target stock + delta/marker ledger entries
3. Digital / non-tracked products skip stock bootstrap

Re-running seed is safe: duplicate marker keys are ignored.

---

## 11. Internal modules (do not import from routes)

| Module | Role |
|--------|------|
| `InventoryMutationService` | Only caller of `productRepo.batchUpdateStock` |
| `InventoryReservationService` | Reservation CRUD + oversell cases |
| `InventoryLedgerService` | Append-only log + idempotency lookup |
| `InventoryFlowService` | Public orchestration |
| `createInventoryStack` | Single wiring factory |
| `inventoryMutationBackend.ts` | Checkout-facing reserve/confirm/release contract |
| `inventoryRouteAdapter.ts` | HTTP mapping |
| `inventoryHttpMapping.ts` | Error code → status |

Tests use `createInventoryStack()` with in-memory repos (`src/tests/helpers/inMemoryInventoryStores.ts`).

---

## 12. Verification

Frozen invariants are proven by the inventory test suite:

```bash
npm test -- --run \
  src/tests/inventory-protocol.test.ts \
  src/tests/inventory-verification-ladder.test.ts \
  src/tests/inventory-location-consistency-ladder.test.ts \
  src/core/PurchaseOrderService.test.ts \
  src/core/CartService.test.ts
```

### Protocol ladder (`inventory-protocol.test.ts`)

| Invariant | Proof |
|-----------|-------|
| Availability does not mutate | `batchUpdateStock` not called |
| Reserve decrements + ledger | Stock and ledger entries |
| Duplicate reserve | No double-decrement |
| Confirm without second decrement | Stock unchanged after confirm |
| Release restores + idempotent | Stock restored once |
| Adjust/deltas idempotent | Marker prevents double-apply |
| Reconcile flags discrepancies | Cases opened |
| Cleanup partial failure | Structured report, no throw |

### Error-mapping ladder (`inventory-verification-ladder.test.ts`)

| Invariant | Proof |
|-----------|-------|
| `InsufficientStockError` → `INSUFFICIENT_STOCK` | `inventoryFromError` |
| Transient → `UNKNOWN` retryable | Error message heuristics |
| Reserve insufficient | No mutation |
| Ledger read | `getProductLedger` |
| Client idempotency on adjust | Duplicate key safe |

### Location consistency ladder (`inventory-location-consistency-ladder.test.ts`)

| Invariant | Proof |
|-----------|-------|
| PO receive updates catalog once | Single `batchUpdateStock` |
| PO receive updates location once | Single `adjustQuantity` |
| Duplicate PO receive | No double-add (receive marker) |
| Catalog failure | Location never touched |
| Location failure | Catalog rolled back, `LOCATION_RECEIVE_FAILED` |
| Ledger records productId / locationId / purchaseOrderId | Line entries |
| `PurchaseOrderService` never calls `applyInventoryDeltas` | Static seal |
| Routes/UI use protocol only | Static seal |

---

## 13. Audit checklist

```txt
[x] No route writes inventory count directly
[x] Checkout calls InventoryMutationBackend (reserve / confirm / release)
[x] Cart add/update calls checkAvailability for physical items
[x] Admin adjustments go through adjustInventory()
[x] PO receiving goes through receiveStockAtLocation() only
[x] Refund/transfer restock uses applyInventoryDeltas()
[x] Every mutation creates a ledger entry
[x] Every mutation has an idempotency key
[x] Duplicate reserve/confirm/release/adjust/deltas/receive do not double-mutate
[x] Partial cleanup returns structured report (207 on partial failure)
[x] InventoryResult<T> maps cleanly to HTTP
[x] Oversell creates reconciliation case, not silent corruption
[x] Firestore product repo rejects direct stock writes
[x] Product PATCH rejects stock field
[x] Seed loader: stock 0 + ledger-aligned bootstrap
[x] Admin bulk edits send client idempotency keys
[x] receiveStockAtLocation fans out catalog + location + ledger
[x] Location receive failure rolls back catalog when not transactional
[x] Ledger records productId / locationId / purchaseOrderId on location_receive
```

---

## 14. Key files

```
src/core/inventory/
  inventoryApplicationService.ts   # Public interface + I/O types
  InventoryFlowService.ts          # Orchestrator
  InventoryMutationService.ts    # Only batchUpdateStock caller
  InventoryReservationService.ts # Reservation lifecycle
  InventoryLedgerService.ts        # Append-only audit
  InventoryMutationBackend.ts      # Checkout contract (reserve/confirm/release)
  inventoryResult.ts               # InventoryResult<T> helpers
  inventoryHttpMapping.ts          # Error → HTTP status
  createInventoryStack.ts          # Wiring factory
  index.ts                         # Public exports

src/infrastructure/
  server/inventoryRouteAdapter.ts
  repositories/firestore/FirestoreInventoryLedgerRepository.ts
  repositories/firestore/FirestoreInventoryReservationRepository.ts
  repositories/firestore/FirestoreInventoryReconciliationRepository.ts
  repositories/firestore/FirestoreInventoryLevelRepository.ts
  repositories/firestore/products/index.ts   # Stock write guards

src/core/
  container.ts                     # createInventoryApplication + services.inventory
  PurchaseOrderService.ts          # receiveStockAtLocation caller
  ProductService.ts                # adjustInventory for admin catalog
  CartService.ts                   # checkAvailability
  order/checkoutMutationService.ts # InventoryMutationBackend consumer

src/tests/
  inventory-protocol.test.ts
  inventory-verification-ladder.test.ts
  inventory-location-consistency-ladder.test.ts
  helpers/inMemoryInventoryStores.ts
```

---

## 15. One construction path

- **Production:** `getInitialServices().inventory` or `getServiceContainer().inventory`
- **Tests:** `createInventoryStack()` or `createOrderTestStack()` with in-memory repos
- **Never:** `productRepo.batchUpdateStock()` outside `InventoryMutationService`
- **Never:** `PurchaseOrderService` → `applyInventoryDeltas` (use `receiveStockAtLocation`)
