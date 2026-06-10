# Architecture

DreamBees Art is a **layered TypeScript monolith**: one Next.js deployable that contains storefront, admin, API routes, and commerce orchestration. The design goal is Shopify-familiar surfaces with **explicit protocol boundaries** for anything that moves money or stock.

---

## Layer model

| Layer | Path | Responsibility | Constraints |
| --- | --- | --- | --- |
| **Domain** | `src/domain/` | Models, repository interfaces, pure rules, validation, calculations, typed errors | No I/O. No Next.js, Firestore, fetch, or cookies. |
| **Core** | `src/core/` | Application services, workflow orchestration, commerce protocols | No HTTP. Delegates to injected adapters. |
| **Infrastructure** | `src/infrastructure/` | Firestore repos, Firebase/Stripe/Brevo adapters, session, guards | Implements Domain contracts; maps transport ↔ Core. |
| **App Router** | `src/app/` | Pages and `route.ts` handlers | Thin: parse, guard, delegate to `services.*`, map results. |
| **UI** | `src/ui/` | React pages and components | Calls APIs via `apiClientServices.ts`; no direct Infra. |
| **Utils** | `src/utils/` | Formatters, logging, SEO helpers | Stateless. |

**Rule:** Domain stays pure. Core owns business workflow. Routes never call payment processors or stock mutation helpers directly.

---

## Service container

All server-side wiring flows through `src/core/container.ts`:

```text
getInitialServices() / getServerServices()
  → checkout      CheckoutApplicationService
  → refunds       RefundApplicationService
  → inventory     InventoryApplicationService
  → admin         AdminApplicationService
  → orderService, productService, cartService, …  (internal / read / fulfillment)
  → refundService                               (internal — RefundFlowService only)
```

Factory paths:

| Protocol | Factory | Flow implementation |
| --- | --- | --- |
| Checkout | `createCheckoutStack()` / `wireOrderCheckoutStack()` | `CheckoutFlowService` |
| Refunds | `createRefundStack()` | `RefundFlowService` |
| Inventory | `createInventoryStack()` | `InventoryFlowService` |
| Admin | `createAdminStack()` | `AdminFlowService` + domain admin services |

---

## Request lifecycle

```text
1. HTTP request → src/app/api/.../route.ts
2. Guards        → session, role, rate limit, same-origin (apiGuards.ts)
3. Parse body    → domain-aligned validators
4. Delegate      → services.checkout | refunds | inventory | admin | read services
5. Result        → typed *Result<T> → route adapter → JSON + HTTP status
6. Audit         → optional operator/customer audit records
```

Forensic fields (`orderId`, `caseId`, `stripeEventId`, `idempotencyKey`) are logged at protocol boundaries for operator investigation.

---

## Commerce protocols

These four boundaries are **frozen**. See [commerce-protocol-frozen.md](./commerce-protocol-frozen.md).

```txt
checkout  = money capture      → CheckoutApplicationService
refunds   = money reversal     → RefundApplicationService
inventory = stock movement     → InventoryApplicationService
admin     = human authority    → AdminApplicationService
```

### Result types

Each protocol returns a discriminated union — expected failures do not throw:

| Protocol | Result type | Adapter |
| --- | --- | --- |
| Checkout | `CheckoutResult<T>` | `checkoutRouteAdapter.ts` |
| Refunds | `RefundResult<T>` | `refundRouteAdapter.ts` |
| Inventory | `InventoryResult<T>` | `inventoryRouteAdapter.ts` |
| Admin | `AdminResult<T>` | `adminRouteAdapter.ts` |

### Authority chain

```text
Storefront checkout     → services.checkout
Stripe webhook          → services.checkout.handleCheckoutWebhook
Admin refund button     → services.admin.requestRefund → services.refunds.createRefund
Concierge refund tool   → services.refunds.createRefund (source: concierge)
Admin stock adjust      → services.admin → services.inventory
PO receive              → services.admin → inventory receive paths
```

**Invariant:**

```txt
No route, tool, admin action, or automation touches raw money mutation services directly.
```

`RefundService.processRefund()` is internal to `RefundFlowService` only.

---

## Persistence

Runtime commerce data is stored in **Firestore** via repository adapters under `src/infrastructure/repositories/firestore/`.

| Domain | Collections (representative) |
| --- | --- |
| Catalog | products, collections, taxonomy |
| Cart & checkout | carts, orders, checkout attempts, stripe webhook events |
| Inventory | inventory_levels, reservations, ledger, reconciliation cases |
| Refunds | refund_execution_claims, refund_execution_events |
| Admin ops | operator_action_events, audit |
| Support | tickets, knowledgebase |
| Marketing | campaigns, segments |

Checkout and refund protocols maintain **idempotency claim collections** separate from order documents to survive duplicate webhooks and retries.

---

## Security model

| Mechanism | Location | Purpose |
| --- | --- | --- |
| Signed session cookie | `session.ts` | Customer and admin identity |
| Admin route guards | `apiGuards.ts`, admin layouts | Role and elevation checks |
| Same-origin mutations | `assertTrustedMutationOrigin` | CSRF mitigation |
| Rate limits | Route-level guards | Abuse protection |
| Checkout lock | Checkout protocol | One active checkout per user |
| Idempotency keys | Checkout, refunds, admin mutations | Safe retries |
| Elevation | Admin protocol | Destructive ops require elevated actor + reason |

---

## Testing strategy

| Layer | Tooling |
| --- | --- |
| Protocol invariants | Vitest verification ladders (`src/tests/*-verification-ladder.test.ts`) |
| Flow modules | Unit tests with in-memory repos |
| API routes | Route-level tests where critical |
| Storefront journeys | Playwright e2e (`e2e/`) |
| Throughput baseline | `npm run benchmark:order-flow` (Core, in-memory) |

Protocol changes require updating the relevant verification ladder — that is the seal.

---

## Key entry files

```
src/core/container.ts              # Service wiring
src/infrastructure/server/services.ts
src/domain/models.ts               # Core entity shapes
src/ui/apiClientServices.ts        # Browser → API facade
src/ui/navigation/adminNavigation.ts
```

Deep dives:

- [checkout.md](./checkout.md)
- [inventory.md](./inventory.md)
- [refunds.md](./refunds.md)
- [admin.md](./admin.md)
