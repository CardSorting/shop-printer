# WoodBine

**Old Hall. New Flavors.**

WoodBine is a Salt Lake City food hall anchored in a historic, beautifully restored warehouse—a neighborhood table where independent vendors, regulars, and first-timers gather for cold drinks, full plates, and the best kind of company.

Come for the food, stay for the people—and the space. No membership, no dress code—just show up.

## Current Project Shape

| Area | Current implementation |
| --- | --- |
| Storefront | Home, product listing/detail, collections, search, cart, checkout, account, orders, wishlist, support, blog, and digital vault pages. |
| Checkout and orders | `CheckoutApplicationService` (`services.checkout` / `CheckoutFlowService`) is the only checkout boundary for routes. It coordinates sessions, webhooks, recovery, cleanup, and operator actions. `OrderService` handles fulfillment, reads, and admin mutations only. |
| Admin console | Dashboard, orders, products, bulk editor, inventory, receiving/purchase orders, suppliers, collections, taxonomy, discounts, analytics, support tickets, settings, files, blog, audit, and operations planning routes. |
| Persistence | Firestore repositories implement Domain repository contracts for products, carts, orders, discounts, settings, suppliers, inventory, support, marketing, wishlists, and digital access. |
| Security | Signed HTTP-only sessions, admin route guards, same-origin mutation policy, rate-limit guards, idempotency keys, and checkout locks. |
| Test coverage | Vitest unit/integration tests plus Playwright e2e tests for checkout, security, admin inventory, shopping flow, chaos regression, and commerce workflows. |

Repository snapshot:

- 136 API route files under `src/app/api`.
- 59 App Router page files under `src/app`.
- 45 test/spec files across unit, integration, API, and e2e coverage.
- Firestore-backed service container in `src/core/container.ts`.
- Documentation ledger in `.wiki/` and long-form docs in `docs/`.

## Architecture

The codebase follows a layered TypeScript architecture:

| Layer | Path | Responsibility |
| --- | --- | --- |
| Domain | `src/domain/` | Models, repository contracts, pure rules, validation, calculations, and typed errors. |
| Core | `src/core/` | Application services and workflow orchestration. |
| Infrastructure | `src/infrastructure/` | Firestore repositories, Firebase/Auth bridges, Stripe/Brevo/storage adapters, server guards, and session helpers. |
| App Router | `src/app/` | Next.js pages and API transport boundaries. |
| UI | `src/ui/` | React pages, reusable components, checkout components, admin components, hooks, and browser API facade. |
| Utils | `src/utils/` | Stateless formatters, validators, logging, SEO, navigation, and image helpers. |

The main design rule is that Domain stays free of I/O and framework imports. Core owns orchestration. Infrastructure and App Router adapt real transport/storage/payment behavior into those contracts.

## Checkout Architecture

Checkout is intentionally explicit because it is the highest-risk workflow in the system.

Core flow:

1. Validate shipping address and acquire `checkout_lock:{userId}`.
2. Create or resume the idempotent checkout attempt.
3. Read cart, verify product price/availability, reserve stock, create pending order, record checkout attempt, and clear cart.
4. Create or resume Stripe PaymentIntent.
5. Persist the payment mapping and wait for webhook or success-page verification.
6. Finalize payment into paid/fulfilled state or route unsafe states into reconciliation.

Key implementation files:

- `src/core/order/CheckoutFlowService.ts`
- `src/core/order/createCheckoutStack.ts`
- `src/core/order/checkoutWorkflow.ts`
- `src/core/order/checkoutForensics.ts`
- `src/infrastructure/repositories/firestore/FirestoreOrderRepository.ts`
- `src/app/api/checkout/create-payment-intent/route.ts`
- `src/app/api/checkout/verify/route.ts`
- `src/app/api/webhooks/stripe/route.ts`

See [Checkout Orchestration](docs/checkout-orchestration.md) and [Order Flow Throughput](.wiki/architecture/order-flow-throughput.md).

## Benchmark Baseline

A reproducible Core-level benchmark exists for cart, checkout, and full order/payment/finalization flows:

```bash
npm run benchmark:order-flow
```

Latest local benchmark summary:

| Flow | Max clean concurrency tested | Throughput | p95 latency | Failures |
| --- | ---: | ---: | ---: | ---: |
| Cart add-to-cart | 200 | 31,150.57 ops/sec | 7.40 ms | 0 |
| Checkout reservation | 200 | 22,495.54 ops/sec | 10.39 ms | 0 |
| Full order + payment finalization | 100 | 11,125.71 ops/sec | 9.47 ms | 0 |

These numbers measure Core orchestration with in-memory adapters and a mocked Firebase transaction bridge. They are a repeatable application baseline, not a Firestore or Stripe production capacity claim.

## Quick Start

Prerequisites:

- Node.js 22.x expected by `package.json`.
- Firebase project with Firestore and Authentication enabled.
- Stripe account for payment flows.
- Environment variables configured for Firebase, Stripe, session signing, and any optional email/AI integrations.

Install and run:

```bash
npm install
npm run setup
npm run dev
```

Useful verification commands:

```bash
npm run lint
npm run build
npm run test
npm run test:e2e
npm run benchmark:order-flow
```

## Documentation

Start here:

- [Knowledge Ledger](.wiki/index.md)
- [Project State](.wiki/architecture/project-state.md)
- [Architecture Overview](.wiki/architecture/overview.md)
- [Directory Dictionary](.wiki/architecture/directories.md)
- [Schemas](.wiki/architecture/schemas.md)
- [Risk Map](.wiki/architecture/risk-map.md)
- [Order Flow Throughput](.wiki/architecture/order-flow-throughput.md)
- [Checkout Orchestration](docs/checkout-orchestration.md)
- [Whitepaper](docs/woodbine-crm-whitepaper.md)

## Tech Stack

- Next.js `15.5.18` App Router
- React `18.3.1`
- TypeScript `~6.0.2`
- Firebase `12.13.0` and Firebase Admin `13.9.0`
- Stripe SDK `17.2.0`
- Tailwind CSS `4.2.4`
- Vitest `3.2.4`
- Playwright `1.59.1`

## License

MIT. See [LICENSE](LICENSE).
