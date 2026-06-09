# WoodBine CRM Platform Whitepaper

## Abstract

WoodBine is a TypeScript CRM platform built around a practical thesis: teams need more than disconnected SaaS tools for customer operations. This repository places support, lifecycle marketing, order management, merchant administration, digital fulfillment, and operational intelligence into one inspectable workspace.

The system is not organized as a generic demo. It is organized as a merchant operating system for a collectible/art business, with strong emphasis on checkout correctness, recoverable payment state, administrative clarity, and future extensibility.

## Problem Statement

Commerce systems fail in predictable places:

- Checkout creates duplicate orders or loses the connection between payment and fulfillment.
- Inventory changes race under concurrent buyers.
- Admin tools do not match how operators actually receive stock, resolve orders, and answer support.
- Support, marketing, fulfillment, and order history live in separate systems with weak context.
- Documentation drifts away from the code until operators and future developers cannot tell what is actually true.

WoodBine addresses those problems by keeping the core business workflows in source-controlled TypeScript, backed by explicit Domain contracts and Firestore adapters.

## Project Goals

The project is attempting to achieve five concrete outcomes.

1. A trustworthy checkout and order lifecycle that can survive retries, webhook races, partial payment failures, and stale browser sessions.
2. A merchant admin console that supports daily operations: orders, catalog, inventory, receiving, suppliers, customers, discounts, analytics, support, content, files, audit, and settings.
3. A support and concierge layer that turns customer conversations into operational signals instead of isolated chat transcripts.
4. A digital fulfillment path for purchased assets with authenticated vault access.
5. A documentation and verification loop where architecture, benchmarks, risk maps, and project state stay close to the code.

## Architectural Model

WoodBine uses a layered architecture:

| Layer | Path | Purpose |
| --- | --- | --- |
| Domain | `src/domain/` | Pure models, repository interfaces, business rules, validations, calculations, and errors. |
| Core | `src/core/` | Application services and workflow orchestration. |
| Infrastructure | `src/infrastructure/` | Firestore, Firebase, Stripe, Brevo, storage, server session, and guard adapters. |
| App Router | `src/app/` | Next.js pages and HTTP API boundaries. |
| UI | `src/ui/` | React screens, admin components, checkout components, hooks, and browser API facade. |
| Utils | `src/utils/` | Shared stateless helpers. |

The central constraint is that Domain must stay free of I/O and framework dependencies. Core coordinates Domain rules and injected repositories. Infrastructure owns concrete Firestore/payment/auth behavior.

## Current Implementation Footprint

As of May 21, 2026, the repository contains:

- 136 API route files under `src/app/api`.
- 59 App Router page files under `src/app`.
- 45 test/spec files.
- Firestore repositories for product, cart, order, discount, settings, transfer, purchase order, inventory, supplier, collection, taxonomy, wishlist, ticket, knowledgebase, shipping, lock, campaign, campaign event, and customer segment data.
- A benchmark harness for cart, checkout, and full order/payment/finalization flows.

This footprint matters because the project already spans both customer-facing and operator-facing commerce surfaces. The whitepaper’s claims are anchored to those files, not a planned architecture alone.

## Checkout as the Reliability Center

The checkout flow is the highest-risk workflow. WoodBine treats it as a recoverable state machine rather than a simple submit button.

The implementation centers on:

- `src/core/order/CheckoutFlowService.ts`
- `src/core/order/checkoutWorkflow.ts`
- `src/core/order/checkoutForensics.ts`
- `src/infrastructure/repositories/firestore/FirestoreOrderRepository.ts`
- `src/app/api/checkout/create-payment-intent/route.ts`
- `src/app/api/checkout/verify/route.ts`
- `src/app/api/webhooks/stripe/route.ts`

The checkout lifecycle:

1. Validate the shipping address.
2. Acquire a per-user checkout lock.
3. Create or resume the checkout attempt by idempotency key.
4. Read the cart and product records inside the transaction boundary.
5. Validate cart items and prices.
6. Reserve inventory for physical items.
7. Create a pending order and checkout attempt record.
8. Clear the cart.
9. Create or resume the Stripe PaymentIntent.
10. Persist the payment mapping.
11. Finalize by webhook or success-page verification.
12. Complete the checkout or create an operator-visible reconciliation case.

This model is designed to converge. A retry should either return the existing idempotent order, continue the payment flow, early-exit from an already finalized order, or route unsafe evidence to reconciliation.

## Reconciliation and Forensics

The project explicitly models failure states that many commerce systems hide:

- Payment succeeded but local finalization did not complete.
- Payment succeeded after local cancellation.
- Stripe metadata points to an order linked to another PaymentIntent.
- A PaymentIntent exists without a local order mapping.
- Checkout fencing tokens mismatch.
- Finalization fails after payment succeeds.

Those cases are not treated as generic errors. They become reconciliation cases with operator-visible messages and next actions. This is important because financial correctness depends on making unsafe states visible instead of pretending all failures are retryable.

## Merchant Operations

WoodBine includes a broad admin surface:

- Orders and order details.
- Product management, product form, product search, and bulk editing.
- Inventory, locations, receiving, purchase orders, suppliers, and transfers.
- Discounts, customers, collections, taxonomy, analytics, audit, settings, files, and navigation.
- Blog/content workflows.
- Support tickets, macros, and knowledgebase content.
- Concierge insights and lifecycle recovery funnels.

The admin navigation is centralized in `src/ui/navigation/adminNavigation.ts`, which keeps labels, aliases, and actions aligned across the merchant console.

The project intentionally uses operator-facing language for workflows such as "Receiving" rather than requiring users to think in database objects like purchase-order line rows.

## Support, Concierge, and Lifecycle Marketing

The support system is not only a ticket inbox. It is part of the operational intelligence layer.

Implemented documentation and code paths include:

- `docs/concierge/overview.md`
- `.wiki/architecture/concierge-system.md`
- `.wiki/architecture/lifecycle-marketing-concierge.md`
- `src/core/ConciergeService.ts`
- `src/core/marketing/CampaignService.ts`
- `src/core/marketing/MarketingStrategy.ts`
- `src/core/marketing/MarketingIntelligence.ts`
- `src/app/api/concierge/chat/route.ts`
- `src/app/api/admin/concierge/marketing-strategy/route.ts`

The intended outcome is a help-first customer operations loop:

1. Understand customer context from cart, orders, support sentiment, and campaign history.
2. Suppress marketing when support risk or consent constraints make outreach inappropriate.
3. Draft or activate lifecycle campaigns only when the evidence supports them.
4. Keep campaign activity visible to operators.

## Digital Fulfillment

Digital fulfillment is represented as a first-class capability rather than an afterthought. The project includes authenticated vault access and digital asset management through:

- `src/ui/pages/DigitalLibraryPage.tsx`
- `src/ui/components/admin/DigitalAssetManager.tsx`
- `src/app/api/account/vault/route.ts`
- `src/app/api/downloads/[assetId]/route.ts`
- `src/infrastructure/repositories/firestore/FirestoreDigitalAccessRepository.ts`
- `.wiki/architecture/digital-fulfillment.md`

The goal is to let the same order system support physical collectibles and digital purchases.

## Security and Operational Controls

The repository includes multiple guardrails:

- Signed HTTP-only session cookies.
- Admin-session enforcement for privileged routes.
- Same-origin mutation checks.
- Rate-limit guards for public mutations.
- Idempotency keys for checkout/order creation.
- Firestore-backed locks.
- Audit service calls for sensitive operations.
- Reconciliation cases for unsafe payment states.

These controls do not remove the need for production review, but they establish a clear reliability model inside the application code.

## Benchmark Evidence

The repository includes a reproducible Core benchmark:

```bash
npm run benchmark:order-flow
```

Latest local benchmark:

| Flow | Max clean concurrency tested | Throughput | p95 latency | Failures |
| --- | ---: | ---: | ---: | ---: |
| Cart add-to-cart | 200 | 31,150.57 ops/sec | 7.40 ms | 0 |
| Checkout reservation | 200 | 22,495.54 ops/sec | 10.39 ms | 0 |
| Full order + payment finalization | 100 | 11,125.71 ops/sec | 9.47 ms | 0 |

The benchmark uses real Core services with in-memory adapters and a mocked Firebase transaction bridge. It proves the application orchestration path can handle the tested independent-user concurrency levels locally. It does not prove production Firestore, Stripe, network, or hosting capacity.

The production benchmark still needed is a staging or emulator run with realistic Firestore transactions, Stripe test-mode calls, cold starts, and hot inventory contention.

## Technical Tradeoffs

WoodBine chooses explicitness over minimalism.

Benefits:

- The order lifecycle is visible and recoverable.
- Domain rules are testable without infrastructure.
- Operators get purpose-built workflows rather than raw data tables.
- Support, marketing, and order history can share context.
- Documentation can point directly to implementation files.

Costs:

- More code exists in the application layer than in a minimal SaaS integration.
- Firestore hot documents, shared stats updates, and external API latency must be capacity-tested separately.
- The architecture requires discipline: Domain must remain pure, Core must not absorb transport details, and docs must be updated when workflows change.

## Roadmap Implications

The next maturity steps are:

- Run order-flow benchmarks against Firestore emulator and staging.
- Add production-style load tests that include API route guards and HTTP overhead.
- Keep reconciliation dashboards and operator recovery actions tightly aligned with Stripe evidence.
- Continue removing stale documentation and codename drift.
- Expand test coverage around support/marketing suppression and fulfillment edge cases.
- Treat admin route coverage and navigation coverage as a release checklist.

## Conclusion

WoodBine is attempting to be a self-owned commerce operations platform, not just a storefront. Its strongest current architectural asset is the explicit checkout/order recovery model. Its broadest product asset is the combined customer, merchant, support, fulfillment, and marketing surface in one repository.

The system is already concrete enough to document and benchmark at the Core boundary. The remaining gap before making production-scale claims is external-capacity validation against Firestore, Stripe, hosting, and realistic traffic patterns.

