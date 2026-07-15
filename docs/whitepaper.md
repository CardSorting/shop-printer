# MeowAcc — Technical Whitepaper

**Inspectable, self-hosted ecommerce with protocol-bound money and stock paths.**

Version: reflects repository state as of the storefront release gate (`test:storefront-release`).

**Executive summary:** [brief.md](./brief.md) · **Design principles:** [philosophy.md](./philosophy.md)

---

## Abstract

MeowAcc is an open-source ecommerce platform that delivers Shopify-class merchant and customer surfaces while keeping transactional logic in explicit, testable application protocols. Deployed as a Next.js monolith on Firebase and Stripe, it gives operators familiar workflows and gives engineering teams full source access, recoverable checkout, auditable inventory movement, and automated proof gates that enforce architectural boundaries at CI time.

The system is designed for merchants and agencies who want **data sovereignty** and **customization depth** without rebuilding catalog, admin, CRM, and fulfillment from scratch — and for engineers who believe self-hosted checkout must be as inspectable as self-hosted databases.

---

## 1. Problem statement

### 1.1 The SaaS trade

Hosted ecommerce platforms optimize for time-to-first-sale. That optimization bundles:

- **Opaque checkout** — finalization, inventory coupling, and recovery are not inspectable in source
- **Platform-hosted data** — export exists; sovereignty does not
- **Customization ceilings** — themes, apps, and API sandboxes stop where the platform stops
- **Compound fees** — subscription plus payment processing plus app costs

For many merchants this trade is correct. For teams with compliance requirements, vertical-specific catalogs, agency multi-tenant forks, or hard reliability SLAs, the trade breaks.

### 1.2 The self-hosted gap

Headless commerce APIs and storefront starters address part of the gap — APIs without admin, or admin without sealed money paths. Teams still assemble checkout recovery, inventory reservation semantics, refund idempotency, and operator tooling themselves.

MeowAcc targets the **full operating system**: storefront, admin, protocols, support CRM, digital fulfillment, and verification infrastructure in one repository.

---

## 2. Design goals

| Goal | Implementation |
| --- | --- |
| **Sovereign data** | Firestore in the deployer's GCP project |
| **Inspectable commerce** | Four mutation protocols + typed results + event log |
| **Recoverable checkout** | Webhook + browser verify paths; idempotent finalization |
| **Operator familiarity** | Shopify-shaped admin labels and workflows |
| **Vertical neutrality** | Generic taxonomy; metafields; rebrandable skin |
| **Provable architecture** | Seal tests, production proofs, release gates |

Philosophy detail: [philosophy.md](./philosophy.md)

---

## 3. System architecture

### 3.1 Layer model

```text
┌─────────────────────────────────────────────────────────┐
│  UI (src/ui)          React storefront + admin          │
│       ↓ apiClientServices.ts                            │
├─────────────────────────────────────────────────────────┤
│  App Router (src/app)  Pages + HTTP route.ts handlers   │
│       ↓ getServerServices()                             │
├─────────────────────────────────────────────────────────┤
│  Core (src/core)       Application protocols + flows    │
│       ↓ injected adapters                               │
├─────────────────────────────────────────────────────────┤
│  Domain (src/domain)   Models, contracts, pure rules    │
├─────────────────────────────────────────────────────────┤
│  Infrastructure        Firestore, Stripe, Auth, guards    │
└─────────────────────────────────────────────────────────┘
```

**Dependency rule:** UI → API → Core → Domain ← Infrastructure. Domain performs no I/O.

Routes are **thin transport**: parse body, assert session/origin, delegate to `services.*`, map `*Result` to HTTP.

### 3.2 Commerce protocols (mutation authority)

Four protocols own all commerce mutations. Raw services (`RefundService`, direct Stripe adapters, repository batch stock writes) are internal.

```txt
checkout  = money capture      → services.checkout
refunds   = money reversal     → services.refunds
inventory = stock movement     → services.inventory
admin     = human authority    → services.admin
```

**Invariant:**

```txt
No route, tool, admin action, or automation touches raw money mutation services directly.
```

Delegation examples:

- Admin refund → `services.admin` → `services.refunds.createRefund({ source: 'admin' })`
- Concierge refund → `services.refunds.createRefund({ source: 'concierge' })`
- Checkout hold → `services.checkout` → `reserveInventory` (never from cart routes)
- Admin stock adjust → `services.admin` → `services.inventory`

Policy: [commerce-protocol-frozen.md](./commerce-protocol-frozen.md) · Laws: [commerce-protocol-laws.md](./commerce-protocol-laws.md)

### 3.3 Storefront frozen chain (customer journey)

Storefront customer flows are sealed in **lanes** — each lane has one server entry, one UI construction path, guard tests, and production proofs.

```txt
catalog / PDP  = read intent source
cart           = purchase intent buffer     (services.cart)
checkout       = commitment gate             (services.checkout)
inventory      = scarcity authority          (reserve at checkout only)
payment        = money capture               (services.checkout + Stripe)
```

**Lane rules:**

- Cart calls `checkAvailability` only — never `reserveInventory`, never payment capture
- Checkout revalidates cart, pricing, and discounts before reservation and PaymentIntent creation
- Payment UI tokenizes via Stripe.js; server routes own capture and webhook finalization
- Client cart code imports `@core/cart/cartMutations` — not the `@core/cart` barrel (prevents `firebase-admin` in browser bundle)

Release gate: [storefront-release.md](./storefront-release.md)

```bash
npm run test:storefront-release   # frozen storefront proof suite
npm run test:e2e:cart-smoke       # isolated cart-to-checkout journey
npm run test:e2e:checkout-smoke   # isolated mocked checkout journey
```

### 3.4 Purchase flow (happy path)

| Step | Lane | Behavior |
| ---: | --- | --- |
| 1 | Cart | Add line; `checkAvailability` for physical SKUs |
| 2 | Checkout | `createCheckoutSession` → lock, reserve, pending order, PaymentIntent |
| 3 | Payment | Customer confirms via Stripe.js (or mock in E2E) |
| 4 | Finalize | Webhook `payment_intent.succeeded` and/or `POST /api/checkout/verify` — idempotent |
| 5 | Inventory | `confirmReservation` — no second stock decrement |
| 6 | Operator | Order visible in admin; events in `commerce_events` |

Steps 4a/4b may run in parallel; both paths call the same idempotent finalization.

Full narrative: [flows.md § Purchase](./flows.md#purchase-flow-storefront-checkout)

---

## 4. Reliability model

### 4.1 Idempotency

Checkout, refunds, inventory batch operations, and sensitive admin mutations require **idempotency keys**. Duplicate requests must not double-charge, double-refund, or double-apply stock deltas.

Order creation uses dedicated idempotency mapping and atomic payment-intent tracking to survive retries and concurrent clients.

### 4.2 Typed results

Protocols return discriminated unions (`*Result<T>`). Expected failures (validation, forbidden, conflict, retryable) are **data**, not thrown exceptions. Route adapters map codes to HTTP status without losing semantics.

### 4.3 Checkout recovery

Production checkout has parallel finalization paths:

- **Stripe webhook** — `POST /api/webhooks/stripe` → `handleCheckoutWebhook`
- **Browser verify** — `POST /api/checkout/verify` → `recoverPendingOrder`

Webhook deduplication is proven in `checkout-webhook-ingress.test.ts` and `payment-capture-proof.test.ts`. Reconciliation cases cover `paid_not_finalized` and related drift.

### 4.4 Inventory reservation lifecycle

```text
Before payment:  catalog stock reduced (reservation hold)
After payment:   reservation committed (no second decrement)
On abandon:      releaseReservation restores catalog stock
```

Digital SKUs and `continueSellingWhenOutOfStock` skip or bypass reservation gates per product rules.

Proof: `inventory-reservation-proof.test.ts`, `inventory-verification-ladder.test.ts`

### 4.5 Transactional atomicity

Critical inventory and order paths use Firestore transactions with strict point-reads. Commerce events publish **post-commit** — ledger writes inside a transaction queue events until the outer transaction succeeds, preventing dual-write inconsistency.

### 4.6 Correlation and debugging

`correlationId` (typically `order:{orderId}`) links checkout, inventory, refund, and support mutations. Operator timelines reconstruct from the unified event stream.

Keys: `orderId`, `idempotencyKey`, `checkoutAttemptId`, `paymentIntentId`

---

## 5. Event architecture

Protocols publish through `CommerceEventBus` into append-only `commerce_events`.

```text
protocols = authority     (mutate durable state)
events    = memory        (record what happened)
timeline  = observability (operator reconstruction)
```

Cross-protocol invariants (e.g. `refund.created` requires prior payment confirmation) live in `commerceInvariants.ts` with tests in `commerce-invariants.test.ts`.

We deliberately avoid Kafka/Pub/Sub for runtime commerce. Operational truth must be queryable in the same database operators already use.

---

## 6. Verification architecture

MeowAcc treats tests as **architectural enforcement**, not optional coverage.

### 6.1 Test pyramid

| Layer | Examples | When |
| --- | --- | --- |
| **Release gate** | `test:storefront-release` | Any storefront/cart/checkout/catalog change |
| **Seal / guard** | `protocol-guard`, `*-protocol-guard` | Route import boundaries |
| **Production proof** | `cart-production-proof`, `payment-capture-proof` | Lane behavioral invariants |
| **Verification ladder** | `checkout-verification-ladder`, etc. | Protocol semantics |
| **Cart E2E smoke** | `test:e2e:cart-smoke` | Guest/auth cart state and checkout handoff |
| **Checkout E2E smoke** | `test:e2e:checkout-smoke` | Checkout UI regression |
| **Benchmark** | `benchmark:order-flow` | Throughput regression (in-memory adapters) |

### 6.2 Storefront release gate

`npm run test:storefront-release` runs 17 Vitest files covering:

- Umbrella: `storefront-release-guard`
- Per-lane guards: catalog, PDP, cart, checkout
- Proofs: cart, checkout, inventory reservation, payment capture
- Ladders: inventory, checkout, webhook ingress
- UI unit: `validateBeforeCommit`, catalog/PDP `viewState`

### 6.3 E2E cart smoke

`npm run test:e2e:cart-smoke` runs seven Playwright tests against an isolated dev server. It covers guest persistence, authenticated merge, quantity limits, discounts, mixed and unavailable shipping, and payment failure.

### 6.4 E2E checkout smoke

`npm run test:e2e:checkout-smoke` runs four Playwright tests against an isolated dev server with `NEXT_PUBLIC_E2E_MOCK_CHECKOUT=1`:

- Happy path through mock pay → order confirmation
- Invalid cart blocked by `gateCheckoutCommit`
- Payment API error surfaced in UI
- Retired `POST /api/orders` method remains unavailable

Both commands share a runner that owns the dev lifecycle: it clears port 3000, starts a fresh server, runs only the selected spec, and cleans up on success or failure.

Detail: [testing.md](./testing.md)

---

## 7. Product surfaces

### 7.1 Storefront

Home, collections, product detail (handle URLs, JSON-LD), search, cart, checkout, account, orders, wishlist, support center, blog, digital vault.

### 7.2 Admin

Dashboard, orders, products, bulk editor, inventory (multi-location, ledger, PO receive), customers, discounts, collections, taxonomy, shipping, analytics, SEO, tickets, blog, files, audit log.

### 7.3 Support & Concierge

Ticketing with agent collision, macros, knowledge base. Optional Gemini/Vertex Concierge with tool execution bounded by the same protocol cages (refunds via `services.refunds`, not raw services).

### 7.4 Shopify capability map

| Area | Status | Notes |
| --- | --- | --- |
| Online store | ✅ | SEO, sitemap, structured data |
| Cart & checkout | ✅ | Frozen lanes + release gate |
| Orders & fulfillment | ✅ | Tracking import, CSV export |
| Inventory | ✅ | Reservations, ledger, PO |
| Refunds | ✅ | Admin + Concierge protocols |
| Support CRM | ✅ | Tickets, KB, macros |
| Apps marketplace | ⚠️ | Fork/patch; webhook hooks roadmap |
| Multi-store SaaS | ❌ | Single-tenant per deploy |

Full table: [platform-overview.md](./platform-overview.md)

---

## 8. Deployment model

```text
Browser → Next.js (Node 22) → Core protocols → Firestore / Stripe / Brevo
```

**Deployer provides:** Firebase (Auth + Firestore), Stripe keys + webhook endpoint, hosting (Firebase Hosting script included), optional Brevo and AI keys.

**Deployer owns:** All transactional records, payment processor relationship, source changes, release cadence.

Health: `GET /api/system/health/protocols` — monitor for `ok: true`.

Guides: [deployment.md](./deployment.md) · [production-readiness.md](./production-readiness.md) · [release-checklist.md](./release-checklist.md)

---

## 9. Security posture

| Control | Mechanism |
| --- | --- |
| Server-side commerce | Money/stock mutations only in API → protocols |
| Session integrity | HTTP-only signed cookies (`SESSION_SECRET`) |
| CSRF mitigation | `assertTrustedMutationOrigin` on mutations |
| Admin least privilege | Role + elevation for sensitive ops |
| Client boundary | UI does not write Firestore directly |

Detail: [security.md](./security.md)

---

## 10. Extensibility

- **Metafields** — custom product/order attributes without schema forks
- **Collections & taxonomy** — vertical-specific catalog organization
- **UI fork** — React/Tailwind in `src/ui/`; protocol cages unchanged
- **Adapter swap** — infrastructure implements domain contracts; core stays stable

Customization rules: [customization.md](./customization.md) · Safe extension: [contributing-commerce.md](./contributing-commerce.md)

---

## 11. Roadmap gaps

Honest limitations versus Shopify Plus / app ecosystems:

- Multi-tenant SaaS hosting layer
- Public app/webhook plugin marketplace
- Native POS hardware
- Built-in email marketing automation (Concierge experiments + Brevo transactional mail today)

Strategic tracker: [MEOWACC_ROADMAP.md](../MEOWACC_ROADMAP.md)

---

## 12. Repository scale

Snapshot verified July 14, 2026.

| Metric | Approximate |
| --- | ---: |
| API route files | 150 |
| App Router page files | 71 |
| Test/spec files | 103 across `src/` and `e2e/` |
| Storefront release gate | Frozen multi-lane suite (`npm run test:storefront-release`) |

Service wiring: `src/core/container.ts`

---

## 13. Conclusion

MeowAcc is built on a simple bet: **self-hosted commerce that cannot be inspected cannot be trusted at scale.**

The platform delivers familiar merchant surfaces while cageing money and stock behind protocols, sealing the storefront journey in provable lanes, and enforcing architecture with release gates — not documentation alone.

For operators, that means recoverable checkout and auditable stock. For engineers, that means forks without roulette. For the ecosystem, that means open source commerce with boundaries sharp enough to survive real money.

---

## Appendix — Key commands

```bash
npm install && npm run setup && npm run dev

npm run test:storefront-release
npm run test:e2e:cart-smoke
npm run test:e2e:checkout-smoke
npm test -- --run src/tests/*-verification-ladder.test.ts
npm run benchmark:order-flow
```

## Appendix — Document map

| Document | Role |
| --- | --- |
| [brief.md](./brief.md) | One-page summary |
| [philosophy.md](./philosophy.md) | Design principles |
| [architecture.md](./architecture.md) | Layer and container detail |
| [storefront-release.md](./storefront-release.md) | Frozen chain proofs |
| [flows.md](./flows.md) | End-to-end commerce stories |
| [index.md](./index.md) | Full documentation hub |
