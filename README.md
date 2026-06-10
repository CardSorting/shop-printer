# DreamBees Art

**Open-source, self-hosted ecommerce — Shopify-class capabilities, full source access.**

DreamBees Art is a standalone commerce platform you deploy and own. It ships a customer storefront, merchant admin, checkout pipeline, inventory engine, support CRM, marketing concierge, and digital fulfillment — the same surface area merchants expect from Shopify, without SaaS lock-in or per-transaction platform fees.

The reference deployment in this repository uses **WoodBine** demo branding (food-hall skin). Replace store name, SEO, and theme content via admin settings and `src/domain/seo/brand.ts` for your merchant.

## What you get

| Surface | Capabilities |
| --- | --- |
| **Storefront** | Home, collections, product pages, search, cart, checkout, account, order history, wishlist, support center, blog, digital vault |
| **Admin** | Dashboard, orders, products, bulk editor, inventory, locations, PO receiving, suppliers, customers, discounts, collections, taxonomy, shipping, analytics, SEO, support tickets, blog, files, audit log, operations planning |
| **Commerce core** | Protocol-bound checkout, refunds, inventory, and admin authorization — no route-level money or stock freelancing |
| **Support & AI** | Ticketing, knowledge base, macros, and Concierge (customer chat + operator workspace) |
| **Integrations** | Stripe payments, Firebase Auth + Firestore, Brevo email, optional Gemini/Vertex for Concierge |

## Why open source instead of Shopify

| | Shopify (SaaS) | DreamBees Art (self-hosted) |
| --- | --- | --- |
| **Data** | Platform-hosted | Your Firestore project |
| **Customization** | Themes, apps, Liquid limits | Full TypeScript source |
| **Fees** | Subscription + transaction fees | Infrastructure you pay for directly |
| **Checkout** | Managed black box | Inspectable protocol with recovery and reconciliation |
| **Extensibility** | Webhooks and app store | Fork, patch, and wire your own adapters |

## Architecture

Layered TypeScript monolith on Next.js App Router:

| Layer | Path | Role |
| --- | --- | --- |
| Domain | `src/domain/` | Models, repository contracts, pure rules — no I/O |
| Core | `src/core/` | Application services and workflow orchestration |
| Infrastructure | `src/infrastructure/` | Firestore, Firebase, Stripe, email, guards, adapters |
| App Router | `src/app/` | Pages and HTTP API boundaries |
| UI | `src/ui/` | React storefront and admin components |

### Commerce protocols (frozen)

All mutations go through application protocols — raw services are internal:

```txt
checkout  = money capture      → services.checkout   (CheckoutApplicationService)
refunds   = money reversal     → services.refunds    (RefundApplicationService)
inventory = stock movement     → services.inventory  (InventoryApplicationService)
admin     = human authority    → services.admin      (AdminApplicationService)
```

**Invariant:** No route, tool, admin action, or automation touches raw money-mutation services directly.

See **[docs/commerce-protocol-frozen.md](docs/commerce-protocol-frozen.md)** and **[docs/architecture.md](docs/architecture.md)**.

## Quick start

**Prerequisites:** Node.js 22, Firebase project (Auth + Firestore), Stripe account, `.env` from `.env.example`.

```bash
npm install
npm run setup
npm run dev
```

**Verify:**

```bash
npm run lint
npm run build
npm run test
npm run test:e2e
npm run benchmark:order-flow
```

Full setup: **[docs/onboarding.md](docs/onboarding.md)** (guided) · **[docs/getting-started.md](docs/getting-started.md)** (reference)

## Documentation

**Start here:** [docs/onboarding.md](docs/onboarding.md) — day-0 checklist, first test purchase, learning path.

| Doc | Contents |
| --- | --- |
| [docs/onboarding.md](docs/onboarding.md) | Day-0 checklist, first test purchase |
| [docs/day-2.md](docs/day-2.md) | Rebrand, trace requests, production prep |
| [docs/flows.md](docs/flows.md) | Purchase, receive, refund, reconciliation |
| [docs/troubleshooting.md](docs/troubleshooting.md) | Symptom-first debugging |
| [docs/architecture.md](docs/architecture.md) | Layers, protocols, entity model |
| [docs/api-overview.md](docs/api-overview.md) | HTTP route map |
| [docs/glossary.md](docs/glossary.md) | Terms |
| [docs/contributing-commerce.md](docs/contributing-commerce.md) | Safe extension checklist |
| [docs/platform-overview.md](docs/platform-overview.md) | Shopify comparison |
| [docs/storefront.md](docs/storefront.md) · [docs/admin.md](docs/admin.md) | Merchant surfaces |
| [docs/checkout.md](docs/checkout.md) · [docs/inventory.md](docs/inventory.md) · [docs/refunds.md](docs/refunds.md) | Protocol reference |
| [docs/commerce-protocol-frozen.md](docs/commerce-protocol-frozen.md) | Frozen mutation policy |
| [docs/concierge/overview.md](docs/concierge/overview.md) | AI support layer |
| [docs/index.md](docs/index.md) | Full documentation hub |

Operational wiki: [.wiki/index.md](.wiki/index.md)

## Tech stack

- Next.js 15 App Router, React 18, TypeScript
- Firebase 12 + Firestore, Firebase Admin
- Stripe 17
- Tailwind CSS 4
- Vitest + Playwright

## Repository snapshot

- ~142 API routes under `src/app/api`
- ~67 App Router pages under `src/app`
- Service container: `src/core/container.ts`
- 320+ automated tests

## License

MIT — see [LICENSE](LICENSE).
