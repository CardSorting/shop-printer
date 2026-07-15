# Platform Overview

DreamBees Art is a **standalone, open-source ecommerce application** that mirrors the core capabilities merchants expect from Shopify — storefront, checkout, catalog, inventory, orders, customers, discounts, content, analytics, and support — while keeping the entire stack in your repository and your cloud accounts.

This is not a headless-only API or a theme kit. It is a full merchant operating system: customer-facing shop, operator admin, payment processing, stock movement, refunds, and support CRM in one deployable Next.js application.

**Strategy:** [brief.md](./brief.md) · [philosophy.md](./philosophy.md) · [whitepaper.md](./whitepaper.md)

**Get running:** [onboarding.md](./onboarding.md) · **See flows in action:** [flows.md](./flows.md)

---

## Design goals

1. **Sovereign data** — Products, orders, customers, and inventory live in your Firestore project, not a vendor silo.
2. **Inspectable commerce** — Checkout, refunds, and inventory are explicit protocols with typed results, idempotency, and verification tests — not hidden route spaghetti.
3. **Operator-first admin** — Navigation and workflows follow familiar ecommerce labels (Orders, Products, Customers, Discounts, Analytics) so teams migrating from Shopify recognize the job-to-be-done.
4. **Extensible substrate** — Metafields, collections, taxonomy, shipping zones, and API-backed admin screens support vertical-specific catalogs without forking the core engine.
5. **Optional AI layer** — Concierge adds conversational support and lifecycle marketing on top of the same order and ticket data operators already use.

---

## Shopify capability map

The table below maps common Shopify merchant features to DreamBees Art implementation status. “Protocol” means the behavior is sealed behind an `ApplicationService` boundary with proof tests.

| Shopify area | DreamBees Art | Notes |
| --- | --- | --- |
| Online store | ✅ Storefront pages + collections + SEO | Handle-based URLs, JSON-LD, sitemap hooks |
| Cart & checkout | ✅ Frozen lanes | `services.cart` (intent buffer) + `services.checkout` (commitment + payment); [cart contract](./cart.md), proof: `test:storefront-release` |
| Orders & fulfillment | ✅ Admin + customer account | Fulfillment, notes, tracking import, Pirate Ship CSV export |
| Products & variants | ✅ Admin + bulk editor | Metafields, digital and physical types |
| Inventory | ✅ Protocol | Multi-location levels, reservations, ledger, PO receive |
| Customers | ✅ Admin CRM views | Account pages, vault for digital goods |
| Discounts | ✅ Codes + validation | Cart and checkout integration |
| Collections & navigation | ✅ Manual + automated taxonomy | Admin navigation editor |
| Shipping rates | ✅ Zones, classes, rates API | Quoted at checkout |
| Analytics | ✅ Admin dashboard | Sales and operational signals |
| Content (blog) | ✅ Storefront + admin CMS | Authors, comments, subscribers |
| Support | ✅ Tickets + KB + macros | Agent collision, health checks |
| Refunds | ✅ Protocol | Admin + Concierge via `RefundApplicationService` |
| Apps / extensions | ⚠️ Source-level | Fork and patch; webhook hooks roadmap |
| Multi-store | ❌ Single-tenant deploy | One Firestore project per deployment |
| Theme marketplace | ❌ | Customize React/Tailwind in `src/ui/` |

---

## Deployment model

```text
Browser (storefront + admin)
    ↓ HTTPS
Next.js App Router (src/app)
    ↓
Core application protocols (src/core)
    ↓
Infrastructure adapters (src/infrastructure)
    ↓
Firebase Auth · Firestore · Stripe · Brevo · (optional AI)
```

**You provide:**

- Firebase project (Authentication + Firestore + optional Storage)
- Stripe account (publishable key, secret, webhook secret)
- Hosting (Firebase Hosting script included, or any Node 22 host)
- Optional: Brevo for transactional email, Gemini/Vertex for Concierge

**You own:**

- All transactional and customer records
- Payment processor relationship (Stripe fees only)
- Source code changes and release cadence

---

## Commerce core (frozen)

Four protocols own **all commerce mutations**:

```txt
checkout  = money capture
refunds   = money reversal
inventory = stock movement
admin     = human authority
```

```txt
No route, tool, admin action, or automation touches raw money mutation services directly.
```

Raw services (`RefundService`, direct Stripe calls, `productRepo.batchUpdateStock`, etc.) are **internal**. Routes and tools call:

- `services.checkout`
- `services.refunds`
- `services.inventory`
- `services.admin`

Policy: **[commerce-protocol-frozen.md](./commerce-protocol-frozen.md)**

---

## Codebase footprint

Repository snapshot verified July 14, 2026 (useful for onboarding, not a SLA):

| Metric | Count |
| --- | ---: |
| API route files | 150 |
| App Router page files | 71 |
| Test/spec files | 103 across `src/` and `e2e/` |
| Storefront release gate | `npm run test:storefront-release` |

Persistence is **Firestore-only** for runtime commerce (SQLite references in env are legacy/seed tooling).

---

## Branding and demo store

The repository ships with **WoodBine** as reference merchant branding (food-hall demo copy, local SEO defaults). That is skin, not architecture.

To rebrand:

1. Admin → Settings → store name, SEO, social previews
2. `src/domain/seo/brand.ts` — canonical brand constants
3. `public/` — logos and OG images
4. `.env` — `NEXT_PUBLIC_SITE_URL`, business address fields for local schema

The engine uses generic commerce terminology in admin navigation (Products, Orders, Customers) regardless of vertical.

---

## Roadmap gaps (honest)

Items commonly found in Shopify Plus or app ecosystems that are **not** first-class here yet:

- Multi-tenant SaaS hosting layer
- Public app/webhook plugin marketplace
- Native POS hardware integration
- Built-in email marketing automation (Concierge covers lifecycle experiments; Brevo sends mail)

Track strategic direction in [SHOPMORE_ROADMAP.md](../SHOPMORE_ROADMAP.md) at repo root.

---

## Where to go next

| Goal | Document |
| --- | --- |
| Executive summary | [brief.md](./brief.md) |
| Design philosophy | [philosophy.md](./philosophy.md) |
| Technical whitepaper | [whitepaper.md](./whitepaper.md) |
| Run locally | [onboarding.md](./onboarding.md) · [local-development.md](./local-development.md) |
| All protocols | [protocols.md](./protocols.md) |
| Rebrand / fork | [customization.md](./customization.md) |
| From Shopify | [migration-from-shopify.md](./migration-from-shopify.md) |
| Env reference | [environment-variables.md](./environment-variables.md) |
| Release | [release-checklist.md](./release-checklist.md) |
| Understand layers | [architecture.md](./architecture.md) |
| End-to-end stories | [flows.md](./flows.md) |
| Debug | [troubleshooting.md](./troubleshooting.md) |
| Extend code | [contributing-commerce.md](./contributing-commerce.md) |
| Terms | [glossary.md](./glossary.md) |
| Storefront features | [storefront.md](./storefront.md) |
| Storefront release proofs | [storefront-release.md](./storefront-release.md) |
| Merchant admin | [admin.md](./admin.md) |
| Checkout internals | [checkout.md](./checkout.md) |
| Stock internals | [inventory.md](./inventory.md) |
| Refund internals | [refunds.md](./refunds.md) |
| HTTP routes | [api-overview.md](./api-overview.md) |
| Production | [deployment.md](./deployment.md) · [runbook.md](./runbook.md) |
| FAQ | [faq.md](./faq.md) |
