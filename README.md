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

Full setup: **[docs/getting-started.md](docs/getting-started.md)**

## Documentation

| Doc | Contents |
| --- | --- |
| [docs/index.md](docs/index.md) | Documentation hub |
| [docs/platform-overview.md](docs/platform-overview.md) | Shopify comparison, feature map, deployment model |
| [docs/architecture.md](docs/architecture.md) | Layers, protocols, request lifecycle |
| [docs/storefront.md](docs/storefront.md) | Customer-facing features and routes |
| [docs/admin.md](docs/admin.md) | Merchant console and operator workflows |
| [docs/getting-started.md](docs/getting-started.md) | Environment, seed, deploy |
| [docs/checkout.md](docs/checkout.md) | Checkout protocol reference |
| [docs/inventory.md](docs/inventory.md) | Inventory protocol reference |
| [docs/refunds.md](docs/refunds.md) | Refund protocol reference |
| [docs/concierge/overview.md](docs/concierge/overview.md) | AI support and lifecycle marketing |
| [docs/commerce-protocol-frozen.md](docs/commerce-protocol-frozen.md) | Frozen mutation policy |

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
