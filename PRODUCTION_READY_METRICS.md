# WoodBine Readiness and Verification Report

- **Engine**: WoodBine CRM Platform
- **Current status**: Architecture and Core workflows are strongly documented and locally benchmarked. Production capacity still requires staging or emulator load validation with Firestore, Stripe, hosting, and realistic network latency.
- **Substrate**: Google Cloud Firestore
- **Framework**: Next.js `15.5.18` App Router

## Verification Snapshot

| Area | Current evidence | Notes |
| --- | --- | --- |
| Checkout integrity | `CheckoutApplicationService` (`services.checkout` / `CheckoutFlowService`), event-log idempotency, checkout order states, and focused checkout tests. | Routes depend only on the checkout boundary; Stripe/cancel/operator deps are stack-injected. |
| Core throughput | `npm run benchmark:order-flow` with raw output in `.wiki/architecture/order-flow-throughput-results.json`. | Core orchestration benchmark only, not production Firestore/Stripe capacity. |
| API surface | 136 `src/app/api/**/route.ts` files. | Public, customer, admin, checkout, webhook, support, concierge, and system routes. |
| App surface | 59 `src/app/**/page.tsx` files. | Storefront, account, admin, support, blog, and operational pages. |
| Tests | 45 test/spec files across Vitest and Playwright. | Includes checkout, security, admin inventory, chaos regression, and ecommerce flows. |
| Persistence | Firestore repositories under `src/infrastructure/repositories/firestore/`. | Business code depends on Domain repository contracts. |
| Security | Signed HTTP-only sessions, admin guards, same-origin mutation policy, rate limits, idempotency keys, and checkout locks. | Production secret, rate, CSP, and backup settings still need environment-specific review. |

## Local Benchmark Baseline

| Flow | Max clean concurrency tested | Throughput | p95 latency | Failures |
| --- | ---: | ---: | ---: | ---: |
| Cart add-to-cart | 200 | 31,150.57 ops/sec | 7.40 ms | 0 |
| Checkout reservation | 200 | 22,495.54 ops/sec | 10.39 ms | 0 |
| Full order + payment finalization | 100 | 11,125.71 ops/sec | 9.47 ms | 0 |

Benchmark command:

```bash
npm run benchmark:order-flow
```

## Industrialized Modules

### Checkout and Orders

- Per-user checkout lock: `checkout_lock:{userId}`.
- Order idempotency mapping.
- PaymentIntent-to-order mapping.
- Payment finalization via webhook or verification route.
- Reconciliation cases for unsafe paid/local mismatches.
- Forensic timeline support for operator investigation.

### Merchant Operations

- Admin dashboard, orders, product management, bulk editor, inventory, receiving, suppliers, discounts, analytics, support, files, blog, audit, settings, and operations planning.
- Shared admin navigation in `src/ui/navigation/adminNavigation.ts`.
- Firestore-backed repositories and Core services wired through `src/core/container.ts`.

### Support, Concierge, and Marketing

- Support CRM tickets, macros, and knowledgebase routes.
- Concierge insight and chat surfaces.
- Lifecycle marketing strategy, campaign intelligence, and campaign service orchestration.
- Suppression-oriented marketing governance documented in `.wiki/architecture/lifecycle-marketing-concierge.md`.

### Digital Fulfillment

- Customer vault route and UI.
- Authenticated download route.
- Firestore digital access repository.
- Admin digital asset management component.

## Readiness Caveats

Before making a production-scale claim, validate:

- Firestore transaction latency and quota behavior under staged load.
- Stripe test-mode latency, webhook retries, and webhook/verification races.
- Hot inventory document contention for popular products.
- Shared order stats update behavior under sustained checkout traffic.
- Hosting cold starts, API route guard overhead, and CDN/runtime configuration.
- Firestore scheduled backups and restore procedure.
- Production `SESSION_SECRET`, allowed origins, CSP, and rate-limit values.

## Documentation Links

- [Project State](.wiki/architecture/project-state.md)
- [Order Flow Throughput](.wiki/architecture/order-flow-throughput.md)
- [Checkout Orchestration](docs/checkout-orchestration.md)
- [CRM Platform Whitepaper](docs/woodbine-crm-whitepaper.md)

## Conclusion

WoodBine has a concrete and documented architecture with a locally benchmarked Core checkout/order pipeline. The strongest verified evidence is at the application orchestration layer. The remaining production-readiness work is external-capacity validation and environment hardening, not a rewrite of the Core order model.
