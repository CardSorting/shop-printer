# DreamBees Art — Philosophy

How we think about open-source commerce, and why the architecture looks the way it does.

**Shorter:** [brief.md](./brief.md) · **Longer:** [whitepaper.md](./whitepaper.md)

---

## Thesis

**Commerce software should be sovereign, inspectable, and provable.**

Merchants deserve Shopify-class familiarity without surrendering data, checkout internals, or customization depth. Engineers deserve mutation paths they can read, test, and recover — not black boxes behind webhooks and hope.

DreamBees Art is built on that thesis: a single deployable application where **protocols own authority**, **events own memory**, and **tests own the release gate**.

---

## Principles

### 1. Sovereign by default

Your products, orders, customers, and inventory live in **your** Firestore project. Your payments run through **your** Stripe account. Your hosting, secrets, and release cadence are yours.

Open source here means **source sovereignty** — fork, patch, audit, and ship without a platform veto.

### 2. Inspectable commerce

Self-hosted checkout is not a theme customization problem. It is a **reliability** problem: double charges, stuck reservations, webhook races, partial finalization.

We treat checkout, refunds, and inventory as **explicit protocols** with typed `*Result` envelopes, idempotency keys, correlation IDs, and reconciliation cases — not route spaghetti that only works in the happy path.

If an operator cannot trace `orderId` → reservation → payment → event log, the design failed.

### 3. Protocol cages

All commerce mutations pass through four application services:

```txt
checkout  = money capture
refunds   = money reversal
inventory = stock movement
admin     = human authority
```

Routes, admin screens, Concierge tools, and automations **delegate intent** — they do not call `RefundService`, `StripeService`, or `productRepo.batchUpdateStock` directly.

This is not bureaucracy. It is how you keep one recovery path, one idempotency story, and one audit trail when production misbehaves at 2 a.m.

Constitution: [commerce-protocol-laws.md](./commerce-protocol-laws.md) · Policy: [commerce-protocol-frozen.md](./commerce-protocol-frozen.md)

### 4. Frozen storefront lanes

The customer journey is split into **lanes**, each with one construction path:

```txt
catalog / PDP  = read intent        (discovery only)
cart           = purchase intent     (buffer — no holds, no payment)
checkout       = commitment gate     (revalidate → reserve → pay)
inventory      = scarcity authority   (holds at checkout only)
payment        = money capture        (server-side; UI tokenizes)
```

Lanes exist because storefront code rots fastest. Without sealed boundaries, cart routes start reserving stock, checkout UI starts capturing money, and barrel imports pull `firebase-admin` into the browser bundle.

The frozen chain is enforced by `npm run test:storefront-release`. Detail: [storefront-release.md](./storefront-release.md)

### 5. Proof over promises

Architecture rules that are not tested are suggestions.

We enforce design with layered verification:

| Layer | Mechanism | Purpose |
| --- | --- | --- |
| **Seal tests** | `protocol-guard`, `*-protocol-guard` | Static — routes import the right boundaries |
| **Production proofs** | `*-production-proof`, `*-reservation-proof` | Behavioral — lane invariants hold under orchestration |
| **Verification ladders** | `*-verification-ladder` | Protocol semantics — idempotency, actors, error mapping |
| **Release gate** | `test:storefront-release` | One command across the frozen chain |
| **Cart browser smoke** | `test:e2e:cart-smoke` | Guest/auth cart state and checkout handoff remain deterministic |
| **Checkout browser smoke** | `test:e2e:checkout-smoke` | Checkout UI still completes the journey |

Changing protocol behavior without updating the matching proof is a **regression by definition**, not an oversight to catch later.

### 6. Events are memory; protocols are authority

Protocols mutate durable state. `commerce_events` records what happened in an append-only, queryable log. Operator timelines reconstruct order history from that stream — not from scattered debug prints.

We deliberately avoid distributed brokers for runtime commerce. Operational truth should be **consistent and queryable**, not theatrical.

### 7. Operator-first surfaces

Admin navigation uses industry-standard labels — Products, Orders, Customers, Discounts — so teams migrating from Shopify recognize the job immediately.

The engine is **vertically neutral**. WoodBine demo branding is skin. Metafields, collections, taxonomy, and shipping zones are the extensibility substrate for TCG, apparel, food halls, or digital goods without renaming the core.

### 8. Thin boundaries, thick core

HTTP routes parse, guard, delegate, and adapt. UI calls APIs through `apiClientServices.ts`. Domain stays pure. Core orchestrates. Infrastructure adapts.

**Dependency rule:** UI → API → Core → Domain ← Infrastructure. Domain never imports outward.

This keeps the monolith deployable while preserving seams you can test in isolation.

---

## What we refuse to build

| Temptation | Why we say no |
| --- | --- |
| Route-level money capture | Duplicate finalization, unreconcilable state |
| Cart routes that reserve stock | Wrong authority lane; checkout must revalidate |
| Dual-write mutation paths | Route → repo bypasses idempotency and events |
| Silent protocol bypasses | No typed result → no operator recovery story |
| Verification as optional | Frozen policy without tests is fiction |

Anti-patterns table: [flows.md § Anti-patterns](./flows.md#anti-patterns-do-not-build-these)

---

## The verification mindset

DreamBees Art treats release confidence as **architecture**, not QA headcount.

Before merging storefront or checkout work:

```bash
npm run test:storefront-release
npm run test:e2e:cart-smoke       # cart UI/protocol changes
npm run test:e2e:checkout-smoke   # checkout UI changes
```

Before merging protocol work:

```bash
npm test -- --run src/tests/*-verification-ladder.test.ts
```

This is the social contract of the codebase: **prove the invariant you relied on**.

---

## How this connects to the product vision

[SHOPMORE_ROADMAP.md](../SHOPMORE_ROADMAP.md) names three wedges — **neutrality** (any vertical), **extensibility** (metafields, modular UI), **developer sovereignty** (full source, headless-capable APIs).

The philosophy above is how those wedges stay true as the codebase grows. Neutrality without protocol cages becomes fork chaos. Extensibility without frozen lanes becomes checkout regressions. Sovereignty without proof ladders becomes unmaintainable self-hosting.

---

## Read next

| Topic | Document |
| --- | --- |
| Full technical whitepaper | [whitepaper.md](./whitepaper.md) |
| Layer model | [architecture.md](./architecture.md) |
| End-to-end stories | [flows.md](./flows.md) |
| Storefront release gate | [storefront-release.md](./storefront-release.md) |
| Contributing safely | [contributing-commerce.md](./contributing-commerce.md) |
