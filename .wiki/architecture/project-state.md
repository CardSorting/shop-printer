# Project State

Last updated: May 21, 2026.

This page describes what the repository currently implements. It is intentionally concrete: every major claim maps back to source files or existing documentation.

## Product Intent

WoodBine is a food hall platform for a Salt Lake City gathering place. The project combines vendor menus, ordering, customer support, events, and merchant operations in one inspectable TypeScript workspace.

The project direction is not a thin demo storefront. It is closer to a self-owned merchant operations system:

- Storefront pages for browsing, cart, checkout, account, orders, wishlist, support, and blog.
- Admin pages for catalog, orders, inventory, receiving, suppliers, customers, discounts, analytics, support, content, audit, and settings.
- Core services for checkout, order recovery, refunds, fulfillment, procurement, marketing, concierge, and operational planning.
- Firestore repositories as the production persistence adapter.

## Workspace Inventory

| Surface | Current count | Source |
| --- | ---: | --- |
| API route files | 136 | `src/app/api/**/route.ts` |
| App Router page files | 59 | `src/app/**/page.tsx` |
| Test/spec files | 45 | `src/**/*.test.*`, `e2e/**/*.spec.ts` |
| Firestore repositories | 21 | `src/infrastructure/repositories/firestore/` |
| Primary Core services | 30+ | `src/core/` and `src/core/order/` |

## Storefront Surface

Implemented customer-facing routes include:

- `/` via `src/app/page.tsx`
- `/products` and `/products/[handle]`
- `/collections/[slug]`
- `/search`
- `/cart`
- `/checkout`
- `/account` and `/account/vault`
- `/orders` and `/orders/[id]`
- `/wishlist`
- `/support`, support categories, and support articles
- `/blog` and `/blog/[slug]`

Relevant UI entry points:

- `src/ui/pages/HomePage.tsx`
- `src/ui/pages/ProductsPage.tsx`
- `src/ui/pages/product-detail/ProductDetailPage.tsx`
- `src/ui/pages/CartPage.tsx`
- `src/ui/pages/CheckoutPage.tsx`
- `src/ui/checkout/OrderConfirmation.tsx`
- `src/ui/pages/OrdersPage.tsx`
- `src/ui/pages/OrderDetailPage.tsx`
- `src/ui/pages/DigitalLibraryPage.tsx`
- `src/ui/pages/SupportPage.tsx`

## Merchant Operations Surface

Admin routes currently cover:

- Home dashboard: `src/app/admin/page.tsx`
- Orders: `src/app/admin/orders/page.tsx`, `src/app/admin/orders/[id]/page.tsx`
- Products and bulk editing: `src/app/admin/products/page.tsx`, `src/app/admin/products/bulk-edit/page.tsx`
- Inventory and locations: `src/app/admin/inventory/page.tsx`, `src/app/admin/locations/page.tsx`
- Receiving/purchase orders: `src/app/admin/purchase-orders/page.tsx`, `src/app/admin/purchase-orders/new/page.tsx`
- Suppliers: `src/app/admin/suppliers/page.tsx`
- Collections and taxonomy: `src/app/admin/collections/page.tsx`, `src/app/admin/taxonomy/page.tsx`
- Discounts: `src/app/admin/discounts/page.tsx`
- Customers: `src/app/admin/customers/page.tsx`, `src/app/admin/customers/[id]/page.tsx`
- Support tickets and macros: `src/app/admin/tickets/page.tsx`, `src/app/admin/support/macros`
- Concierge intelligence: `src/app/admin/concierge/page.tsx`
- Analytics, audit, files, navigation, blog, settings, and operations planning.

Shared admin navigation is centralized in `src/ui/navigation/adminNavigation.ts`.

## Core Service Map

| Capability | Core files |
| --- | --- |
| Cart | `src/core/CartService.ts` |
| Checkout/order orchestration | `src/core/OrderService.ts`, `src/core/order/OrderCheckoutService.ts`, `src/core/order/checkoutWorkflow.ts` |
| Order reads/admin/logistics | `src/core/order/OrderReadService.ts`, `OrderAdminService.ts`, `OrderLogisticsService.ts` |
| Refunds | `src/core/RefundService.ts` |
| Fulfillment | `src/core/FulfillmentService.ts`, `src/core/order/OrderFulfillmentWorkflowService.ts` |
| Catalog | `src/core/ProductService.ts`, `CollectionService.ts`, `TaxonomyService.ts` |
| Discounts | `src/core/DiscountService.ts` |
| Procurement | `src/core/PurchaseOrderService.ts`, `SupplierService.ts`, `TransferService.ts` |
| Shipping | `src/core/ShippingService.ts` |
| Support and concierge | `src/core/ConciergeService.ts`, ticket/knowledgebase repositories |
| Lifecycle marketing | `src/core/marketing/CampaignService.ts`, `MarketingStrategy.ts`, `MarketingIntelligence.ts` |
| Operations planning | `src/core/OperationsRuntimeService.ts`, `OperationalPlannerService.ts`, `PolicyEngineService.ts` |

## Persistence and Integration Map

Production adapters are Firestore-first:

- Cart: `FirestoreCartRepository`
- Orders and reconciliation: `FirestoreOrderRepository`
- Product catalog: `FirestoreProductRepository`
- Discounts: `FirestoreDiscountRepository`
- Shipping: `FirestoreShippingRepository`
- Purchasing/inventory/suppliers: `FirestorePurchaseOrderRepository`, `FirestoreInventoryLevelRepository`, `FirestoreInventoryLocationRepository`, `FirestoreSupplierRepository`
- Support CRM and knowledgebase: `FirestoreTicketRepository`, `FirestoreKnowledgebaseRepository`
- Campaigns: `FirestoreCampaignRepository`, `FirestoreCampaignEventRepository`, `FirestoreCustomerSegmentRepository`
- Locks: `FirestoreLocker`

External services:

- Stripe payment processing: `StripePaymentProcessor`, `StripeService`
- Firebase Auth adapter: `FirebaseAuthAdapter`
- Email adapter: `BrevoEmailService`
- Optional trusted checkout gateway: `TrustedCheckoutGateway`

## Checkout Reliability State

The checkout architecture is documented in `docs/checkout-orchestration.md` and benchmarked in `.wiki/architecture/order-flow-throughput.md`.

Verified design properties:

- Per-user checkout lock: `checkout_lock:{userId}`.
- Idempotency key mapping for order creation.
- PaymentIntent-to-order mapping for webhook/verification convergence.
- Explicit checkout workflow phases.
- Rollback for unpaid pending work.
- Reconciliation cases for paid-but-not-finalized, paid-after-cancelled, mapping mismatch, dangling PaymentIntent, fencing mismatch, and finalization failures.
- Forensic timeline support for operator investigation.

## Current Benchmark Baseline

The current local Core benchmark uses real Core services with in-memory adapters:

| Flow | Max clean concurrency tested | Throughput | p95 latency | Failures |
| --- | ---: | ---: | ---: | ---: |
| Cart add-to-cart | 200 | 31,150.57 ops/sec | 7.40 ms | 0 |
| Checkout reservation | 200 | 22,495.54 ops/sec | 10.39 ms | 0 |
| Full order + payment finalization | 100 | 11,125.71 ops/sec | 9.47 ms | 0 |

Run:

```bash
npm run benchmark:order-flow
```

Production throughput still needs staging or emulator testing with real Firestore transaction latency, Stripe test-mode calls, hosting overhead, and hot-document contention.

## Known Documentation Corrections

Older docs sometimes used the project codename `ShopMore` and mentioned SQLite backup/migration paths. The current repository state is WoodBine with Firestore repositories and Firebase bridge code. New documentation should describe Firestore, not SQLite.

## Operating Principle

For future work, update documentation in the same pull as code changes when any of these change:

- Domain model fields.
- Core service workflow.
- API route behavior.
- Firestore collection contract.
- Admin route coverage.
- Checkout/reconciliation semantics.
- Benchmark numbers.

