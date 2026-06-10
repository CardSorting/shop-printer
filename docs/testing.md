# Testing Guide

How DreamBees Art verifies commerce correctness — from protocol seals to browser e2e.

**Quick run:** `npm test` · **Protocol only:** see [quick-reference.md § Verification](./quick-reference.md#verification-fast)

---

## Test pyramid

```text
                    ┌─────────────┐
                    │  Playwright │  e2e/ — full browser journeys
                    └──────┬──────┘
               ┌───────────┴───────────┐
               │  Route + integration   │  src/app/api/**/*.test.ts
               └───────────┬───────────┘
          ┌────────────────┴────────────────┐
          │   Flow + protocol unit tests     │  src/tests/*.test.ts
          └────────────────┬────────────────┘
     ┌─────────────────────┴─────────────────────┐
     │  Verification ladders (architecture seal)  │
     └───────────────────────────────────────────┘
```

---

## Verification ladders (run on every commerce PR)

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

---

## Checkout test suite

| File | Focus |
| --- | --- |
| `checkout-flow-service.test.ts` | CheckoutFlowService public methods |
| `checkout-webhook-ingress.test.ts` | Signature, dedup, concurrent claims |
| `checkout-workflow.test.ts` | Phase transitions |
| `checkout-order-resolver.test.ts` | PI → order lookup |
| `checkout-chaos-resilience.test.ts` | Failure injection |
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
  src/tests/financial-recovery-hardening.test.ts
```

Also documented in [checkout.md §11 Verification](./checkout.md#11-verification).

---

## Inventory test suite

| File | Focus |
| --- | --- |
| `inventory-protocol.test.ts` | Core movement invariants |
| `inventory-verification-ladder.test.ts` | Protocol seal |
| `inventory-location-consistency-ladder.test.ts` | PO receive |
| `src/core/PurchaseOrderService.test.ts` | PO → receiveStockAtLocation |
| `src/core/CartService.test.ts` | Availability checks |

```bash
npm test -- --run \
  src/tests/inventory-protocol.test.ts \
  src/tests/inventory-verification-ladder.test.ts \
  src/tests/inventory-location-consistency-ladder.test.ts
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

```bash
npm run test:e2e
```

Browser tests under `e2e/` — industrialized commerce flows, checkout, admin inventory, etc. Requires dev server or Playwright `webServer` config.

Run before major releases or UI changes to checkout/admin.

---

## Coverage

```bash
npm run test:coverage
```

Vitest coverage report — useful for finding untested routes; protocol ladders are the **architecture** bar, not line coverage alone.

---

## Writing new tests

| Adding… | Test type | Location |
| --- | --- | --- |
| New protocol method | Ladder + flow unit | `src/tests/*-verification-ladder.test.ts` |
| New checkout behavior | Flow + webhook tests | `src/tests/checkout-*.test.ts` |
| New admin mutation | Admin ladder + route seal | `admin-verification-ladder.test.ts` |
| New storefront UI | Playwright | `e2e/` |

Use in-memory helpers: `src/tests/helpers/inMemory*.ts`

Guide: [contributing-commerce.md § Testing layers](./contributing-commerce.md#testing-layers)

---

## CI recommendation

Minimum gate before merge:

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

Optional nightly: `npm run test:e2e`, `npm run benchmark:order-flow`

---

## Related

- [contributing-commerce.md](./contributing-commerce.md)
- [troubleshooting.md § Verification](./troubleshooting.md#verification)
- [commerce-protocol-frozen.md](./commerce-protocol-frozen.md)
