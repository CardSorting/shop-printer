# MeowAcc — Brief

**Open-source, self-hosted ecommerce with Shopify-class surfaces and inspectable commerce internals.**

---

## What it is

MeowAcc is a full merchant operating system in one deployable Next.js application: storefront, admin, checkout, inventory, refunds, support CRM, and optional AI concierge. You run it on your Firebase project and Stripe account. You own the data, the code, and the release cadence.

The reference deployment ships with **WoodBine** demo branding. The engine is vertical-neutral — rebrand via admin settings and `src/domain/seo/brand.ts`.

---

## The problem it solves

SaaS platforms trade sovereignty for convenience. Merchants get familiar UX but opaque checkout, platform-hosted data, customization ceilings, and recurring fees on top of payment processor costs. Teams that need recoverable money paths, auditable stock movement, or deep forks hit walls fast.

MeowAcc inverts the trade: **you operate the stack**, and the codebase enforces **inspectable, testable commerce** instead of hoping routes stayed honest.

---

## Strategy in one screen

```txt
SOVEREIGNTY          Protocol cages + your cloud accounts
INSPECTABILITY       Typed results, event log, reconciliation
PROOF                Guards, production proofs, release gates — not vibes
FAMILIARITY          Products, Orders, Customers — Shopify-shaped admin
```

**Four frozen protocols** own every commerce mutation:

```txt
checkout  = money capture
refunds   = money reversal
inventory = stock movement
admin     = human authority
```

**Six frozen storefront lanes** seal the customer journey:

```txt
catalog/PDP → cart → checkout → inventory holds → payment capture
```

One command proves the chain: `npm run test:storefront-release`.

---

## Who it is for

| Audience | Fit |
| --- | --- |
| **Merchants leaving SaaS** | Familiar surfaces, self-hosted data, no platform transaction tax |
| **Agencies & vertical forks** | Full TypeScript source, metafields, rebranding without engine surgery |
| **Engineering teams** | Explicit protocols, idempotency, webhook recovery, proof ladders |
| **Operators** | Admin CRM, inventory ledger, reconciliation cases, incident runbooks |

Not a fit today: multi-tenant SaaS hosting, app marketplace, or POS hardware — see [whitepaper.md § Roadmap gaps](./whitepaper.md#11-roadmap-gaps).

---

## Proof, not promises

| Gate | Command | What it proves |
| --- | --- | --- |
| Storefront release | `npm run test:storefront-release` | Lane guards + behavioral proofs across catalog → payment |
| Cart smoke | `npm run test:e2e:cart-smoke` | Isolated guest/auth cart and checkout-handoff journey |
| Checkout smoke | `npm run test:e2e:checkout-smoke` | Browser journey with mocked APIs |
| Protocol seals | `*-verification-ladder.test.ts` | Each mutation boundary stays caged |
| Commerce-wide seal | `protocol-guard.test.ts` | Routes never import forbidden services |

Commerce changes without proof updates are architecture violations — by design.

---

## Stack at a glance

Next.js 15 · React 18 · TypeScript · Firestore · Firebase Auth · Stripe · Vitest · Playwright

150 API route files · 71 App Router page files · 103 test/spec files (verified July 14, 2026)

---

## Read next

| Depth | Document |
| --- | --- |
| Why we built it this way | [philosophy.md](./philosophy.md) |
| Full technical thesis | [whitepaper.md](./whitepaper.md) |
| Run it locally | [onboarding.md](./onboarding.md) |
| Capability map | [platform-overview.md](./platform-overview.md) |
| All docs | [index.md](./index.md) |
