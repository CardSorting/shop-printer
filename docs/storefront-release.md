# Storefront Release (Frozen Chain)

The customer storefront is sealed in **lanes** — each lane has a single construction path, protocol guards, and production proofs. Use this document before merging storefront or checkout UI changes.

**One command (Vitest):**

```bash
npm run test:storefront-release
```

**Isolated browser smokes (Playwright):**

```bash
npm run test:e2e:cart-smoke
npm run test:e2e:checkout-smoke
```

---

## Runtime map

```txt
catalog / PDP  = read intent source        (discovery, no mutations)
cart           = purchase intent buffer      services.cart
checkout       = commitment gate             services.checkout
inventory      = scarcity authority          services.inventory (reserve at checkout only)
payment        = money capture               services.checkout (Stripe + webhooks)
```

Cart never reserves stock or captures payment. Checkout revalidates cart, pricing, and discount before `reserveInventory` and payment finalization.

---

## Lane reference

| Lane | Server / core | UI | Guard test | Proof test |
| --- | --- | --- | --- | --- |
| Catalog | `@infrastructure/server/catalog` | `@ui/pages/catalog` | `catalog-protocol-guard.test.ts` | `catalog/viewState.test.ts` |
| Product detail | `@infrastructure/server/product-detail` | `@ui/pages/product-detail` | `product-detail-protocol-guard.test.ts` | `product-detail/viewState.test.ts` |
| Cart | `services.cart` → `CartFlowService` | `@ui/cart`, `useCart` | `cart-protocol-guard.test.ts` | `cart-production-proof.test.ts` |
| Checkout gate | `services.checkout` + `cartIntent.validateCart` | `gateCheckoutCommit`, `CheckoutPage` | `checkout-protocol-guard.test.ts` | `checkout-production-proof.test.ts`, `validateBeforeCommit.test.ts` |
| Inventory holds | `checkoutMutationService` → `reserveInventory` | — | (in `storefront-release-guard`) | `inventory-reservation-proof.test.ts`, `inventory-protocol.test.ts` |
| Payment capture | `services.checkout` routes + webhook | `StripeCheckoutForm` (tokenize only) | `checkout-protocol-guard.test.ts` | `payment-capture-proof.test.ts`, `checkout-webhook-ingress.test.ts` |

Umbrella: `storefront-release-guard.test.ts` · Commerce-wide seal: `protocol-guard.test.ts`

---

## `test:storefront-release`

```bash
npm run test:storefront-release
```

Includes:

- **Guards:** `storefront-release-guard`, `protocol-guard`, `catalog-protocol-guard`, `product-detail-protocol-guard`, `cart-protocol-guard`, `checkout-protocol-guard`
- **Proofs:** `cart-production-proof`, `checkout-production-proof`, `inventory-reservation-proof`, `payment-capture-proof`
- **Ladders:** `inventory-protocol`, `inventory-verification-ladder`, `checkout-verification-ladder`, `checkout-webhook-ingress`
- **UI unit:** `validateBeforeCommit`, `catalog/viewState`, `product-detail/viewState`

Run after any change to `src/ui/pages/catalog`, `src/ui/pages/product-detail`, `src/ui/cart`, `src/ui/checkout`, `src/ui/hooks/useCart.tsx`, cart/checkout API routes, or `checkoutMutationService`.

---

## `test:e2e:cart-smoke` (7 tests, ~15s)

The isolated cart-to-checkout suite uses versioned guest storage and protocol-aware mocks; it requires neither live Firestore nor Stripe.

```bash
npm run test:e2e:cart-smoke
```

| Test | Proves |
| --- | --- |
| Guest merge | Versioned guest intent merges into the authenticated cart |
| Mixed shipping | Physical and digital lines still require the correct shipping step |
| Shipping unavailable | Checkout cannot advance without an available method |
| Payment error | Checkout-session failures remain visible and recoverable |
| Discount | Discount validation updates checkout presentation |
| Quantity boundary | Quantity stops deterministically at the Domain maximum |
| Reload persistence | Guest storage survives reload without test reseeding |

---

## `test:e2e:checkout-smoke` (4 tests, ~20s)

Mocked API checkout journey — no live Stripe or Firestore required.

```bash
npm run test:e2e:checkout-smoke
```

| Test | Proves |
| --- | --- |
| Happy path | Information → shipping → mock pay → order confirmation |
| Invalid cart | `gateCheckoutCommit` blocks payment |
| Payment error | Checkout-session creation error surfaces in `#checkout-error` |
| Retired endpoint | `POST /api/orders` remains unavailable; orders are read-only on that route |

### How it works

- `scripts/run-checkout-smoke.sh` clears port 3000, starts an isolated dev server with `NEXT_PUBLIC_E2E_MOCK_CHECKOUT=1`, runs the selected spec, and stops the server on success or failure
- `e2e/helpers/cartProtocol.ts` — versioned storage and `CartResult` mocks shared by both suites
- `e2e/helpers/checkoutSmoke.ts` — checkout, shipping, verification, and order-read mocks
- `StripeCheckoutForm` shows **Mock Pay (E2E)** when `NEXT_PUBLIC_E2E_MOCK_CHECKOUT=1`
- Config: `playwright.checkout-smoke.config.ts` (no Playwright `webServer` — script owns dev lifecycle)

### Manual dev with mock pay

```bash
npm run dev:e2e
# separate terminal:
npx playwright test --config=playwright.checkout-smoke.config.ts
```

### Prerequisites

```bash
npx playwright install chromium   # first run only
```

### If smoke stalls

1. `npm run cleanup` — kills ghost processes on port 3000
2. Re-run the relevant command: `npm run test:e2e:cart-smoke` or `npm run test:e2e:checkout-smoke`
3. Do not run smoke while actively using `npm run dev` on the same port (smoke clears 3000)

---

## Client bundle rule (cart)

`useCart` imports guest mutations from `@core/cart/cartMutations` and `@core/cart/mergeGuestCart` — **not** the `@core/cart` barrel. Importing the barrel pulls `createCartStack` → `firebase-admin` into the browser bundle and breaks dev/E2E.

---

## Related

- [testing.md](./testing.md) — full test pyramid
- [release-checklist.md](./release-checklist.md) — pre-merge gate
- [cart.md](./cart.md) · [checkout.md](./checkout.md) · [inventory.md](./inventory.md)
- [storefront.md](./storefront.md) — customer-facing routes
- [e2e/helpers/cartProtocol.ts](../e2e/helpers/cartProtocol.ts) — Playwright cart mocks
