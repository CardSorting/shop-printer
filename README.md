# DreamBees Art

**Sovereign ecommerce — Shopify-class surfaces, inspectable commerce internals.**

DreamBees Art is an open-source merchant operating system you deploy on your own cloud. Storefront, admin, checkout, inventory, refunds, support CRM, and digital fulfillment ship in one Next.js application. You own the data, the code, and the money paths — with automated proof gates that keep architecture honest as the codebase evolves.

The reference deployment uses **WoodBine** demo branding. The engine is vertical-neutral; rebrand via admin settings and `src/domain/seo/brand.ts`.

---

## Why this exists

SaaS ecommerce trades sovereignty for speed. DreamBees Art inverts the trade:

| SaaS default | DreamBees Art |
| --- | --- |
| Platform-hosted data | Your Firestore project |
| Opaque checkout | Protocol-bound, recoverable, testable |
| Themes and app limits | Full TypeScript source |
| Subscription + platform fees | Infrastructure you pay for directly |

**Thesis:** commerce software should be **sovereign**, **inspectable**, and **provable**. Read the argument in [docs/philosophy.md](docs/philosophy.md). Executive summary: [docs/brief.md](docs/brief.md). Full technical thesis: [docs/whitepaper.md](docs/whitepaper.md).

---

## Strategy

Two enforcement layers keep the system trustworthy at scale.

### Protocol cages (commerce mutations)

All money and stock mutations pass through four frozen application services — never raw routes or repositories:

```txt
checkout  = money capture      → services.checkout
refunds   = money reversal     → services.refunds
inventory = stock movement     → services.inventory
admin     = human authority    → services.admin
```

```txt
No route, tool, admin action, or automation touches raw money mutation services directly.
```

### Frozen storefront lanes (customer journey)

The shop path is sealed in lanes — each with one construction path and proof tests:

```txt
catalog / PDP  →  cart  →  checkout  →  inventory holds  →  payment capture
   read intent     intent      commitment      scarcity           money
                   buffer         gate          authority          capture
```

Cart never reserves stock. Checkout never skips revalidation. Payment UI tokenizes; the server captures.

**One command proves the chain:**

```bash
npm run test:storefront-release   # 125 Vitest proofs
npm run test:e2e:checkout-smoke   # 3 Playwright checkout tests
```

Detail: [docs/storefront-release.md](docs/storefront-release.md) · Policy: [docs/commerce-protocol-frozen.md](docs/commerce-protocol-frozen.md)

---

## What you get

| Surface | Capabilities |
| --- | --- |
| **Storefront** | Collections, PDP, search, cart, checkout, account, orders, wishlist, support, blog, digital vault |
| **Admin** | Orders, products, bulk editor, inventory, PO receive, customers, discounts, shipping, analytics, SEO, tickets |
| **Commerce core** | Idempotent checkout, reservation lifecycle, refunds, reconciliation, unified event log |
| **Support & AI** | Ticketing, KB, macros, Concierge (bounded by the same protocol cages) |
| **Integrations** | Stripe, Firebase Auth + Firestore, Brevo email, optional Gemini/Vertex |

---

## Architecture

Layered TypeScript monolith on Next.js App Router:

```text
UI (React)  →  App Router (pages + API)  →  Core (protocols)  →  Domain (pure rules)
                                                    ↓
                                          Infrastructure (Firestore, Stripe, guards)
```

| Layer | Path | Role |
| --- | --- | --- |
| Domain | `src/domain/` | Models, contracts, pure rules — no I/O |
| Core | `src/core/` | Checkout, refunds, inventory, admin orchestration |
| Infrastructure | `src/infrastructure/` | Adapters, guards, Firestore, Stripe |
| App Router | `src/app/` | Thin HTTP boundaries |
| UI | `src/ui/` | Storefront and admin — APIs only, no direct Infra |

Deep dive: [docs/architecture.md](docs/architecture.md) · End-to-end flows: [docs/flows.md](docs/flows.md)

---

## Quick start

**Prerequisites:** Node.js 22, Firebase (Auth + Firestore), Stripe, `.env` from `.env.example`.

```bash
npm install
npm run setup
npm run dev
```

**Verify before you ship:**

```bash
npm run lint
npm run build
npm run test
npm run test:storefront-release   # frozen storefront + checkout proofs
npm run test:e2e:checkout-smoke   # mocked checkout browser smoke
npm run test:e2e                  # full Playwright suite
npm run benchmark:order-flow
```

Guided setup: [docs/onboarding.md](docs/onboarding.md) · Reference: [docs/getting-started.md](docs/getting-started.md)

---

## Documentation

| Read this | When |
| --- | --- |
| [brief.md](docs/brief.md) | 2-minute executive overview |
| [philosophy.md](docs/philosophy.md) | Why the architecture is shaped this way |
| [whitepaper.md](docs/whitepaper.md) | Full technical thesis |
| [onboarding.md](docs/onboarding.md) | First run locally |
| [quick-reference.md](docs/quick-reference.md) | Commands and cheat sheet |
| [index.md](docs/index.md) | Complete documentation hub |

| Area | Docs |
| --- | --- |
| Strategy | [brief](docs/brief.md), [philosophy](docs/philosophy.md), [whitepaper](docs/whitepaper.md), [platform-overview](docs/platform-overview.md) |
| Setup | [onboarding](docs/onboarding.md), [local-development](docs/local-development.md), [environment-variables](docs/environment-variables.md) |
| Architecture | [architecture](docs/architecture.md), [protocols](docs/protocols.md), [flows](docs/flows.md), [storefront-release](docs/storefront-release.md) |
| Protocols | [checkout](docs/checkout.md), [inventory](docs/inventory.md), [refunds](docs/refunds.md), [commerce-protocol-frozen](docs/commerce-protocol-frozen.md) |
| Ship | [production-readiness](docs/production-readiness.md), [deployment](docs/deployment.md), [release-checklist](docs/release-checklist.md), [runbook](docs/commerce-incident-runbook.md) |
| Extend | [CONTRIBUTING](CONTRIBUTING.md), [customization](docs/customization.md), [contributing-commerce](docs/contributing-commerce.md), [migration-from-shopify](docs/migration-from-shopify.md) |

Operational wiki: [.wiki/index.md](.wiki/index.md)

---

## Tech stack

Next.js 15 · React 18 · TypeScript · Firestore · Firebase Auth · Stripe 17 · Tailwind CSS 4 · Vitest · Playwright

---

## Repository snapshot

- ~142 API routes · ~67 App Router pages
- Service container: `src/core/container.ts`
- 320+ automated tests · 125-test storefront release gate

---

## Contributing

Contributions welcome. Start with [CONTRIBUTING.md](CONTRIBUTING.md). Commerce and protocol changes also require [docs/contributing-commerce.md](docs/contributing-commerce.md).

---

## License

MIT — Copyright (c) 2026 [William Cruz](LICENSE). See [LICENSE](LICENSE).
