# Cart

The cart is the storefront's **purchase-intent buffer**. It records what a shopper currently wants, but it is not inventory truth, final pricing authority, an inventory reservation, or a payment path.

This document is the canonical reference for the current cart implementation. Checkout handoff is documented in [checkout.md](./checkout.md), and stock authority is documented in [inventory.md](./inventory.md).

---

## Boundary

```text
catalog / product page
  → cart intent
      → checkout commitment gate
          → inventory reservation
              → Stripe payment
```

| Cart may | Cart must never |
| --- | --- |
| Snapshot product title, image, price, and fulfillment metadata | Capture or refund money |
| Read availability through `checkAvailability` | Call `reserveInventory`, `confirmReservation`, or `releaseReservation` |
| Persist authenticated customer intent | Treat a saved price as final checkout authority |
| Validate product, variant, price, discount, and availability drift | Create an order or PaymentIntent |

The public Core contract is `CartApplicationService`, exposed from the service container as `services.cart`. `CartFlowService` is its single production implementation.

---

## Runtime paths

### Guest shopper

```text
Product UI
  → POST /api/cart/preview-line
  → server-built CartLineItem snapshot
  → pure guest mutation
  → cart:guest:v1 localStorage envelope
  → useCart state
```

Guest line mutation is local after the server builds the snapshot. Guest carts do not write Firestore. A guest must sign in before the checkout session can be created.

### Authenticated shopper

```text
Cart UI
  → apiClientServices.cart
  → /api/cart/*
  → services.cart
  → CartFlowService
  → FirestoreCartRepository transaction
```

Add, update, and remove operations execute transactionally. Availability is checked before a physical line is saved, and item changes preserve cart-level note and discount metadata.

### Sign-in transition

```text
cart:guest:v1
  → POST /api/cart/merge-guest
  → add each line through CartFlowService
  → clear local guest storage on complete success
  → preserve the unmerged suffix and surface issues on partial failure
```

The merge stops at the first failed item. Already merged items stay in the authenticated cart; failed and later items remain in guest storage for recovery.

---

## Construction

```text
wireCartStack()
  → createCartStack({ cartRepo, productRepo, inventory, discountService, events })
      → ProductReadModel
      → InventoryAvailabilityReader
      → PricingSnapshotService
      → CartValidationService
      → CartFlowService
```

`createCartStack()` returns only:

- `cart`: the `CartApplicationService` boundary;
- `validation`: the shared validation component used inside the stack;
- `events`: the cart UX event bus.

Routes receive neither the cart repository nor internal helper services. Route handlers parse, guard, delegate to `services.cart`, and adapt `CartResult<T>`.

---

## Application surface

| Method | Purpose |
| --- | --- |
| `getCart` | Load and enrich the authenticated cart |
| `addItem` | Transactionally add or increment one exact line |
| `updateItem` | Transactionally update quantity; quantity `0` removes the line |
| `removeItem` | Remove one exact line |
| `clearCart` | Delete authenticated cart intent |
| `updateNote` | Persist the cart note |
| `applyDiscount` / `clearDiscount` | Persist or remove an authenticated discount code |
| `validateCart` | Detect expiry, catalog, variant, price, availability, and discount drift |
| `previewLineItem` | Build a read-only line snapshot for a guest cart |
| `mergeGuestItems` | Replay guest lines through authenticated cart rules |

Expected failures use this envelope:

```ts
type CartResult<T> =
  | { ok: true; data: T }
  | { ok: false; code: CartErrorCode; message: string; retryable: boolean };
```

Routes convert that result through `cartRouteResponse`; clients should not invent successful cart state after a failed server mutation.

---

## HTTP surface

| Method | Route | Session | Operation |
| --- | --- | --- | --- |
| GET | `/api/cart` | Required | Load cart |
| DELETE | `/api/cart` | Required | Clear cart |
| POST | `/api/cart/items` | Required | Add line |
| PATCH | `/api/cart/items` | Required | Update exact line quantity |
| DELETE | `/api/cart/items` | Required | Remove exact line |
| POST | `/api/cart/note` | Required | Update note |
| POST | `/api/cart/discount` | Required | Apply discount code |
| DELETE | `/api/cart/discount` | Required | Clear discount code |
| POST | `/api/cart/validate` | Required | Validate before checkout; may clear a stale discount |
| POST | `/api/cart/preview-line` | Public | Build guest snapshot; rate-limited |
| POST | `/api/cart/merge-guest` | Required | Merge guest lines after sign-in |

All mutation requests pass the same-origin policy. Authenticated mutations also derive `userId` from the signed session; browser-supplied owner ids are not accepted.

---

## Line identity and limits

A cart line is identified by the complete tuple:

```text
[productId, variantId or null, ordered customImages list]
```

This identity is shared by Domain rules, authenticated mutations, guest mutations, merge, React keys, and PATCH/DELETE request bodies. Two customized products do not collapse merely because their product and variant ids match.

Current limits enforced by Domain/API/storage validation:

| Value | Limit |
| --- | ---: |
| Quantity per line | 99 |
| Lines accepted by one guest merge request | 100 |
| Cart note | 100 characters |
| Custom images per line | 100 |
| Stored custom-image string | 4,096 characters |

Availability checks aggregate quantities across lines sharing a product and variant, even when customization keeps those lines visually separate.

---

## Guest storage protocol

The only accepted browser key is:

```text
cart:guest:v1
```

Its value is a versioned envelope:

```json
{
  "version": 1,
  "cart": {
    "id": "guest",
    "userId": "guest",
    "items": [],
    "updatedAt": "2026-07-14T00:00:00.000Z"
  }
}
```

`loadGuestCart()` validates the envelope and every supported item field. Malformed JSON, the wrong version, invalid quantities, oversized custom-image data, invalid dates, and unversioned payloads are removed. Storage exceptions degrade to the in-memory cart rather than blocking the UI.

There is no legacy-key migration path. Retired keys are intentionally ignored so only one browser protocol can execute.

---

## Client determinism

`CartProvider` owns cart state through `useCart`.

- Mutations share one promise queue, preserving invocation order.
- Every queued operation captures the current owner (`guest` or authenticated user id).
- An operation is rejected if authentication changes before it executes.
- A ref-backed cart snapshot prevents rapid guest mutations from reading stale React state.
- Server failures remain visible through `error`; they are not converted into an empty cart.
- Cart-note editing is local while typing and persists on blur.
- Drawer and full-page cart use the same actions and exact-line identity.

The cart UX event bus is presentation-only. It does not publish payment, inventory, or order events.

---

## Validation and checkout handoff

`validateCart` can report:

- missing products or variants;
- invalid quantities;
- archived or unavailable products;
- out-of-stock lines;
- changed price snapshots;
- invalid or expired discounts;
- an expired cart.

When validation detects a stale discount, the authenticated cart clears that discount and returns `requiresRefresh: true`. This is why `/api/cart/validate` is a guarded mutation rather than a GET.

Checkout calls the cart validation gate before payment, then independently revalidates and reserves inventory inside `services.checkout`. A valid cart is permission to attempt checkout—not proof that stock has been reserved.

---

## Verification

```bash
# Cart unit and storage behavior
npx vitest run \
  src/core/cart/cartFlowService.test.ts \
  src/core/cart/cartMutations.test.ts \
  src/core/cart/mergeGuestCart.test.ts \
  src/ui/cart/guestCartStorage.test.ts

# Structural and production proofs
npm run test:storefront-release

# Isolated browser journey; owns and cleans up its dev server
npm run test:e2e:cart-smoke
```

The cart browser smoke covers guest persistence, guest-to-auth merge, customized/current protocol mocks, quantity limits, discounts, mixed shipping, unavailable shipping, and payment errors.

Protocol guard: `src/tests/cart-protocol-guard.test.ts`. Production proof: `src/tests/cart-production-proof.test.ts`.

---

## File map

| Concern | Current source |
| --- | --- |
| Public contract | `src/core/cart/cartApplicationService.ts` |
| Canonical flow | `src/core/cart/cartFlowService.ts` |
| Stack construction | `src/core/cart/createCartStack.ts` |
| Availability read | `src/core/cart/inventoryAvailabilityReader.ts` |
| Validation | `src/core/cart/cartValidationService.ts` |
| Guest pure mutations | `src/core/cart/cartMutations.ts` |
| Guest merge | `src/core/cart/mergeGuestCart.ts` |
| Line identity | `src/domain/rules.ts` |
| Browser storage | `src/ui/cart/guestCartStorage.ts` |
| Client state | `src/ui/hooks/useCart.tsx` |
| HTTP routes | `src/app/api/cart/` |
| Result adapter | `src/infrastructure/server/cartRouteAdapter.ts` |

Related: [storefront.md](./storefront.md) · [checkout.md](./checkout.md) · [inventory.md](./inventory.md) · [storefront-release.md](./storefront-release.md)
