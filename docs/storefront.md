# Storefront

The DreamBees Art **customer-facing shop** covers discovery, cart, checkout, account, support, and content — the same jobs Shopify’s Online Store channel handles. All pages live under `src/app/` with UI in `src/ui/`.

**Release gate:** [storefront-release.md](./storefront-release.md) · **First test purchase:** [onboarding.md § First purchase walkthrough](./onboarding.md#first-purchase-walkthrough-what-actually-happens) · **Checkout internals:** [checkout.md](./checkout.md) · **Full flow:** [flows.md § Purchase](./flows.md#purchase-flow-storefront-checkout)

---

## Frozen lanes (storefront release)

The storefront customer journey is sealed in lanes. Each lane has one construction path and proof tests.

```txt
catalog / PDP  → read intent (server prepare* + @ui/pages/catalog|product-detail)
cart           → purchase intent buffer (services.cart — no stock holds, no payment)
checkout       → commitment gate (services.checkout — validates cart, reserves inventory)
payment        → money capture (Stripe tokenize in UI; capture via services.checkout)
```

```bash
npm run test:storefront-release    # Vitest — 125 tests
npm run test:e2e:checkout-smoke    # Playwright — 3 mocked checkout tests
```

| Lane | Route example | Entry |
| --- | --- | --- |
| Catalog | `/collections/[slug]`, `/search` | `prepareCatalogPage` → `useCatalog()` |
| Product detail | `/products/[handle]` | `prepareProductDetailPage` → `useProductDetail()` |
| Cart | `/api/cart/*` | `services.cart` |
| Checkout | `/checkout`, `/api/checkout/*` | `services.checkout` + `gateCheckoutCommit()` |

Do not reintroduce legacy aliases (`ProductsPage`, `cartService` shim, direct `reserveInventory` from cart routes).

---

## Customer journey

```mermaid
flowchart LR
  A[Discover] --> B[Product page]
  B --> C[Cart]
  C --> D[Checkout]
  D --> E[Pay Stripe]
  E --> F[Order confirmation]
  F --> G[Account / orders]
  G --> H[Support or Concierge]
```

| Stage | Routes | Backend |
| --- | --- | --- |
| Discover | `/`, `/products`, `/collections/*`, `/search` | Product/collection APIs |
| Evaluate | `/products/[handle]` | Reviews, metafields, availability read |
| Cart | `/cart` | `services.cart` (availability via `checkAvailability` only) |
| Checkout | `/checkout` | `services.checkout` — commitment gate before payment |
| Post-purchase | `/orders`, `/account/vault` | Order query, digital vault |
| Help | `/support`, Concierge bubble | Tickets, KB, AI tools |

---

## Page map

| Route | Purpose |
| --- | --- |
| `/` | Home, featured collections, editorial content |
| `/products` | Product listing and filters |
| `/products/[handle]` | Product detail (variants, metafields, reviews) |
| `/collections/[slug]` | Collection landing |
| `/collections/[slug]/products/[handle]` | Collection-scoped product URL |
| `/search` | Search results |
| `/cart` | Cart review and note |
| `/checkout` | Stripe PaymentIntent checkout |
| `/account` | Profile and preferences |
| `/orders`, `/orders/[id]` | Order history and detail |
| `/wishlist` | Saved products |
| `/support` | Help center, categories, articles |
| `/support/articles/[slug]` | KB article |
| `/blog`, `/blog/[slug]` | Content marketing |
| `/account/vault` | Digital goods locker |

---

## Shopping flow

```text
Browse → Add to cart → Checkout → Pay (Stripe) → Verify / webhook → Order confirmation
```

### Cart API (`services.cart`)

| Endpoint | Method | Role |
| --- | --- | --- |
| `/api/cart` | GET, DELETE | Load or clear cart (`CartResult<CartView>`) |
| `/api/cart/items` | POST, PATCH, DELETE | Line items |
| `/api/cart/validate` | POST | Pre-checkout validation |
| `/api/cart/preview-line` | POST | Guest line snapshot preview |
| `/api/cart/merge-guest` | POST | Merge guest cart on login |
| `/api/cart/note` | POST | Order note |
| `/api/cart/discount` | POST | Apply promo (authed) |

Cart is a **purchase intent buffer** — not financial truth. Physical SKUs use `checkAvailability` only; stock holds happen at checkout via `reserveInventory`.

Client: `useCart` → `services.cart` in `apiClientServices.ts` (no `cartService` shim).

### Checkout API

Checkout mutations go **only** through `services.checkout`:

| Endpoint | Method | Checkout method |
| --- | --- | --- |
| `/api/checkout/create-payment-intent` | POST | `createCheckoutSession` |
| `/api/checkout/verify` | GET | `recoverPendingOrder` |
| `/api/webhooks/stripe` | POST | `handleCheckoutWebhook` |
| `/api/orders` | POST | `completeCheckoutWithPaymentMethod` |

See [checkout.md](./checkout.md) for protocol details.

### Discounts

| Endpoint | Role |
| --- | --- |
| `/api/discounts/validate` | Apply code at cart/checkout |

---

## Account and orders

Authenticated customers use Firebase-backed sessions (HTTP-only cookie).

| Endpoint | Role |
| --- | --- |
| `/api/auth/sign-in`, `sign-up`, `sign-out` | Session lifecycle |
| `/api/auth/forgot-password` | Password reset email |
| `/api/orders` | List orders |
| `/api/account/vault` | Digital asset access |

Order pages show timeline events, tracking links when present, and fulfillment status — patterns familiar from Shopify customer accounts.

---

## Authentication flows

### Guest shopper

```text
Browse → add to cart → checkout as guest OR register mid-flow
  → Firebase Auth (email/password or Google if enabled)
  → signed HTTP-only session cookie
  → cart merged to user id
```

Routes: `/register`, `/login`, `/api/auth/sign-up`, `/api/auth/sign-in`

### Returning customer

Session persists across visits (cookie). Account at `/account` — profile, orders, vault, wishlist.

### Password reset

`/forgot-password` → `POST /api/auth/forgot-password` → Brevo email (when configured)

### Step-up (high-value checkout)

Some checkout paths require recent re-auth (`requireStepUpSessionUser`) — mirrors Shopify high-value order verification pattern.

---

## Checkout client behavior

The checkout page (`/checkout`) uses the commitment gate pattern:

1. `refreshCart()` on load (authed)
2. `gateCheckoutCommit(await services.cart.validateCart())` before payment
3. Information → shipping → payment steps
4. **PaymentIntent path:** `POST /api/checkout/create-payment-intent` with idempotency key → Stripe.js `clientSecret`
5. **Payment-method path:** `services.checkout.completeWithPaymentMethod` → `POST /api/orders`
6. Success: `OrderConfirmation` or verify via `GET /api/checkout/verify?payment_intent=…` (webhook may finalize in parallel)

**Client must not** capture money directly — Stripe UI only creates a `PaymentMethod`; server routes call `services.checkout`.

UI modules: `src/ui/checkout/` (`validateBeforeCommit`, `StripeCheckoutForm`, `stripeClient`).

### E2E mock checkout

When `NEXT_PUBLIC_E2E_MOCK_CHECKOUT=1`, `StripeCheckoutForm` shows a **Mock Pay (E2E)** button (no card entry). Used by `npm run test:e2e:checkout-smoke`.

Stripe test cards: [local-development.md](./local-development.md)

---

## Error states (customer-facing)

| Situation | Typical UX | Backend |
| --- | --- | --- |
| Out of stock | Add-to-cart error | `checkAvailability` |
| Payment declined | Stripe error message | `payment_failed` webhook → rollback |
| Session expired | Re-login prompt | 401 on API |
| Checkout already in progress | Error or resume | Checkout lock |
| Verify slow | Loading / retry | Webhook may still finalize |

Operator/debug: [troubleshooting.md](./troubleshooting.md)

---

- **Handle-based URLs** — `/products/[handle]` (stable, shareable)
- **JSON-LD** and meta tags from product/collection SEO fields
- **Local business schema** from `NEXT_PUBLIC_BUSINESS_*` env vars
- Admin SEO tools mirror Yoast-style guidance (focus keyphrase, preview snippets)

Configuration: admin Settings → SEO, `src/domain/seo/`.

---

## Support center

Public support surface (no admin role required):

| Route / API | Role |
| --- | --- |
| `/support` | Categories and search |
| `/api/support/categories` | Category tree |
| `/api/support/articles/[slug]` | Article content |
| `/api/tickets` | Customer ticket creation |
| `/api/tickets/[id]/messages` | Thread replies |

Macros and agent tools are admin-only.

---

## Concierge (customer chat)

The **Concierge bubble** (`src/ui/components/Concierge/`) provides AI-assisted support on the storefront:

- Session persistence and reconnection
- Order lookup, KB search, ticket open/close
- Autonomous resolutions within policy limits (refunds via `services.refunds`, not raw `RefundService`)

Details: [concierge/overview.md](./concierge/overview.md)

---

## Wishlist and discovery

| Feature | API / storage |
| --- | --- |
| Wishlist | `/api/wishlists`, `/api/wishlists/[id]/items` |
| Recently viewed | Client localStorage + hooks |
| Navigation menu | `/api/navigation` (admin-editable) |
| Collections | `/api/collections/[handle]` |

---

## UI architecture

```
src/ui/pages/catalog/       # Catalog lane (useCatalog, viewState)
src/ui/pages/product-detail/  # PDP lane (useProductDetail, viewState)
src/ui/cart/                # Cart view state, issues, mutations
src/ui/checkout/            # Commitment gate + Stripe presentation
src/ui/hooks/useCart.tsx    # Cart protocol client (import cartMutations directly)
src/ui/apiClientServices.ts # Typed fetch facade
```

Storefront components do **not** import Firestore, `firebase-admin`, or server core stacks directly. Do not import runtime code from the `@core/cart` barrel in client components (use `@core/cart/cartMutations` etc.).

---

## Customization

Unlike Shopify themes, customization is **source-level**:

1. **Branding** — `src/domain/seo/brand.ts`, `public/images/`, admin Settings
2. **Layout** — `src/ui/layouts/`, home page sections in `src/ui/pages/home/`
3. **Product card / detail** — `src/ui/pages/product-detail/`
4. **Checkout UI** — `src/ui/checkout/`, `src/ui/pages/CheckoutPage.tsx`

There is no Liquid layer; merchants fork the repo or maintain a private branch for visual changes.

---

## Related docs

- [storefront-release.md](./storefront-release.md) — proof ladder and E2E smoke
- [checkout.md](./checkout.md) — payment protocol
- [inventory.md](./inventory.md) — stock reservations at checkout
- [testing.md](./testing.md) — full test guide
- [platform-overview.md](./platform-overview.md) — full feature comparison
