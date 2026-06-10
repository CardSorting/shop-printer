# Testing Guide

How DreamBees Art verifies commerce correctness — from protocol seals to browser e2e.

**Quick run:** `npm test` · **Storefront gate:** `npm run test:storefront-release` · **Cheat sheet:** [quick-reference.md § Verification](./quick-reference.md#verification-fast)

---

## Test pyramid

```text
                    ┌─────────────┐
                    │  Playwright │  e2e/ — browser journeys
                    └──────┬──────┘
               ┌───────────┴───────────┐
               │  Route + integration   │  src/app/api/**/*.test.ts
               └───────────┬───────────┘
          ┌────────────────┴────────────────┐
          │   Flow + protocol unit tests     │  src/tests/*.test.ts
          └────────────────┬────────────────┘
     ┌─────────────────────┴─────────────────────┐
     │  Verification ladders + production proofs  │
     └───────────────────────────────────────────┘
```

---

## Storefront release gate (frozen chain)

**Run before merging storefront, cart, or checkout UI work:**

```bash
npm run test:storefront-release
```

**17 files · 125 tests** — catalog, PDP, cart, checkout commitment, inventory reservation, payment capture.

| Category | Files |
| --- | --- |
| Umbrella | `storefront-release-guard.test.ts`, `protocol-guard.test.ts` |
| Catalog / PDP | `catalog-protocol-guard`, `product-detail-protocol-guard`, `viewState` unit tests |
| Cart | `cart-protocol-guard`, `cart-production-proof` |
| Checkout | `checkout-protocol-guard`, `checkout-production-proof`, `checkout-verification-ladder`, `checkout-webhook-ingress`, `validateBeforeCommit` |
| Inventory | `inventory-protocol`, `inventory-verification-ladder`, `inventory-reservation-proof` |
| Payment | `payment-capture-proof` |

Full lane map: **[storefront-release.md](./storefront-release.md)**

### Production proof tests (static + behavioral)

| File | Lane | Key invariants |
| --- | --- | --- |
| `cart-production-proof.test.ts` | Cart | `services.cart` only; snapshots; no payment/inventory |
| `checkout-production-proof.test.ts` | Checkout gate | `validateCart` before reserve; pricing/discount revalidation; webhook delegation |
| `inventory-reservation-proof.test.ts` | Inventory | Cart `checkAvailability` only; checkout owns reserve/confirm/release; expiry cleanup |
| `payment-capture-proof.test.ts` | Payment | UI tokenizes only; routes → `services.checkout`; webhook dedup; cart never touches Stripe |

### Protocol guard tests (route/static seals)

| File | Proves |
| --- | --- |
| `catalog-protocol-guard.test.ts` | Catalog routes use `@infrastructure/server/catalog` + `@ui/pages/catalog` |
| `product-detail-protocol-guard.test.ts` | PDP routes use product-detail protocol |
| `cart-protocol-guard.test.ts` | Cart routes use `services.cart`; no `reserveInventory` or payment |
| `checkout-protocol-guard.test.ts` | Checkout routes use `services.checkout`; UI gates on cart validation |
| `protocol-guard.test.ts` | No route imports raw mutation services or commerce Firestore repos |

---

## Verification ladders (commerce PRs)

These tests **enforce frozen protocol boundaries**. Failures mean a seal broke.

| File | Proves |
| --- | --- |
| `checkout-verification-ladder.test.ts` | Checkout routes → `services.checkout`; webhook dedup; cleanup 207 |
| `inventory-verification-ladder.test.ts` | No direct stock mutation; reserve/commit/release invariants |
| `inventory-location-consistency-ladder.test.ts` | PO receive catalog + location fan-out |
| `refund-verification-ladder.test.ts` | Refund idempotency; admin/concierge seals; actor/reason |
| `admin-verification-ladder.test.ts` | Admin routes → `services.admin`; elevation; operator events |

```bash
npm test -- --run \
  src/tests/checkout-verification-ladder.test.ts \
  src/tests/inventory-verification-ladder.test.ts \
  src/tests/inventory-location-consistency-ladder.test.ts \
  src/tests/refund-verification-ladder.test.ts \
  src/tests/admin-verification-ladder.test.ts
```

Included in `npm run test:storefront-release` for checkout and inventory ladders.

---

## Checkout test suite

| File | Focus |
| --- | --- |
| `checkout-flow-service.test.ts` | CheckoutFlowService public methods |
| `checkout-webhook-ingress.test.ts` | Signature, dedup, concurrent claims |
| `checkout-workflow.test.ts` | Phase transitions |
| `checkout-order-resolver.test.ts` | PI → order lookup |
| `checkout-chaos-resilience.test.ts` | Failure injection |
| `checkout-production-proof.test.ts` | Commitment gate static seals |
| `payment-capture-proof.test.ts` | Money capture boundary |
| `financial-recovery-hardening.test.ts` | Reconciliation, recovery, refunds |
| `admin-reconciliation.test.ts` | Operator actions |
| `webhook.test.ts` | Webhook integration |
| `src/app/api/webhooks/stripe/route.test.ts` | Route layer |
| `src/app/api/checkout/verify/route.test.ts` | Verify route |
| `src/app/api/checkout/create-payment-intent/route.test.ts` | Session create route |

```bash
npm test -- --run \
  src/tests/checkout-verification-ladder.test.ts \
  src/tests/checkout-flow-service.test.ts \
  src/tests/checkout-webhook-ingress.test.ts \
  src/tests/checkout-production-proof.test.ts \
  src/tests/payment-capture-proof.test.ts
```

Also documented in [checkout.md §11 Verification](./checkout.md#11-verification).

---

## Inventory test suite

| File | Focus |
| --- | --- |
| `inventory-protocol.test.ts` | Core movement invariants |
| `inventory-verification-ladder.test.ts` | Protocol seal |
| `inventory-reservation-proof.test.ts` | Checkout-only reservation lifecycle |
| `inventory-location-consistency-ladder.test.ts` | PO receive |
| `src/core/PurchaseOrderService.test.ts` | PO → receiveStockAtLocation |
| `src/core/CartService.test.ts` | Availability checks |

```bash
npm test -- --run \
  src/tests/inventory-protocol.test.ts \
  src/tests/inventory-verification-ladder.test.ts \
  src/tests/inventory-reservation-proof.test.ts
```

---

## Other core tests

| File | Focus |
| --- | --- |
| `firestore-security.test.ts` | Security rules expectations |
| `reconciliation-abuse.test.ts` | Reconciliation edge abuse |
| `hardening.test.ts` | General hardening |
| `concurrency.test.ts` | Concurrent access |
| `audit-contention.test.ts` | Audit under load |
| `discount-proof.test.ts` | Discount validation |

---

## Benchmark (not a SLA)

```bash
npm run benchmark:order-flow
```

Runs `order-flow-throughput.benchmark.test.ts` with in-memory adapters — measures Core orchestration throughput, **not** Firestore/Stripe production capacity.

See [.wiki/architecture/order-flow-throughput.md](../.wiki/architecture/order-flow-throughput.md).

---

## End-to-end (Playwright)

### Checkout smoke (recommended for checkout releases)

```bash
npm run test:e2e:checkout-smoke
```

Three mocked tests (~20s): happy path, cart validation block, payment error. See [storefront-release.md § E2E](./storefront-release.md#teste2echeckout-smoke-3-tests-20s).

First-time setup:

```bash
npx playwright install chromium
```

### Full suite

```bash
npm run test:e2e
```

All specs under `e2e/` — cart, checkout comprehensive, admin inventory, security regressions, etc.

Helpers:

- `e2e/helpers/cartProtocol.ts` — `CartResult` mocks for guest/authed cart
- `e2e/helpers/checkoutSmoke.ts` — checkout smoke mocks and flow helpers

---

## Coverage

```bash
npm run test:coverage
```

Vitest coverage report — useful for finding untested routes; protocol ladders and production proofs are the **architecture** bar, not line coverage alone.

---

## Writing new tests

| Adding… | Test type | Location |
| --- | --- | --- |
| New protocol method | Ladder + flow unit | `src/tests/*-verification-ladder.test.ts` |
| New checkout behavior | Flow + webhook + proof | `src/tests/checkout-*.test.ts` |
| New storefront lane invariant | Guard + proof | `*-protocol-guard.test.ts`, `*-production-proof.test.ts` |
| New admin mutation | Admin ladder + route seal | `admin-verification-ladder.test.ts` |
| New checkout UI journey | Playwright smoke | `e2e/checkout-smoke.spec.ts` |

Use in-memory helpers: `src/tests/helpers/inMemory*.ts`

Guide: [contributing-commerce.md § Testing layers](./contributing-commerce.md#testing-layers)

---

## CI recommendation

Minimum gate before merge:

```bash
npm run typecheck
npm run lint
npm test
npm run test:storefront-release   # if storefront/cart/checkout touched
npm run build
```

Optional before release:

```bash
npm run test:e2e:checkout-smoke
npm run test:e2e
npm run benchmark:order-flow
```

---

## Related

- [storefront-release.md](./storefront-release.md)
- [contributing-commerce.md](./contributing-commerce.md)
- [troubleshooting.md § Verification](./troubleshooting.md#verification)
- [commerce-protocol-frozen.md](./commerce-protocol-frozen.md)
