# Order Flow Throughput Benchmark

Last measured: July 14, 2026 at 17:55 MDT.

This benchmark measures the backend order-flow architecture at the Core service boundary. It exercises the current `CartFlowService` and checkout orchestration with in-memory repositories, a mocked Firebase transaction bridge, and a mocked Stripe adapter. The numbers are a local upper bound for application orchestration logic, not a production Firestore or Stripe network-capacity claim.

## What Was Tested

Command:

```bash
npm run benchmark:order-flow
```

Benchmark source:

- `src/tests/order-flow-throughput.benchmark.test.ts`
- Latest raw output: `.wiki/architecture/order-flow-throughput-results.json`

Covered flows:

- `cart_add_to_cart`: `services.cart.addItem` (`CartFlowService`), including transactional product lookup, cart read, availability validation, exact-line rules, and cart save.
- `checkout_reservation_only`: `services.checkout.reserveCheckout`, including checkout lock, cart read, product verification, stock reservation, order creation, checkout-attempt recording, cart clear, and audit call.
- `checkout_payment_intent_session`: `services.checkout.startClientCheckout`, including reservation, pending-order creation, PaymentIntent creation/mapping, and transition to the client-confirmation phase. It does not simulate webhook payment finalization.

Runner:

- Node: `v23.5.0`
- Vitest/jsdom
- Mocked Firebase transaction bridge
- In-memory cart, product, order, lock, discount, and audit adapters
- Mocked `StripeService.createPaymentIntent`

## Result Summary

Maximum clean concurrency tested:

| Flow | Max clean concurrency tested | Operations tested at that concurrency | Throughput | p95 latency | Failures |
| --- | ---: | ---: | ---: | ---: | ---: |
| Cart add-to-cart | 200 | 2,000 | 19,472.09 ops/sec | 27.42 ms | 0 |
| Checkout reservation | 200 | 1,000 | 14,822.84 ops/sec | 16.35 ms | 0 |
| Checkout PaymentIntent session | 100 | 500 | 13,899.31 ops/sec | 8.04 ms | 0 |

## Full Results

| Scenario | Concurrency | Operations | Throughput | p50 | p95 | p99 | Failures |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| cart_add_to_cart | 25 | 2,000 | 27,501.44 ops/sec | 0.69 ms | 2.50 ms | 3.19 ms | 0 |
| cart_add_to_cart | 50 | 2,000 | 31,235.36 ops/sec | 1.20 ms | 3.23 ms | 3.36 ms | 0 |
| cart_add_to_cart | 100 | 2,000 | 30,329.30 ops/sec | 2.44 ms | 4.55 ms | 5.78 ms | 0 |
| cart_add_to_cart | 200 | 2,000 | 19,472.09 ops/sec | 7.79 ms | 27.42 ms | 30.72 ms | 0 |
| checkout_reservation_only | 25 | 1,000 | 11,016.41 ops/sec | 1.62 ms | 4.25 ms | 7.11 ms | 0 |
| checkout_reservation_only | 50 | 1,000 | 14,240.97 ops/sec | 3.24 ms | 5.08 ms | 5.46 ms | 0 |
| checkout_reservation_only | 100 | 1,000 | 14,215.58 ops/sec | 6.92 ms | 8.25 ms | 8.26 ms | 0 |
| checkout_reservation_only | 200 | 1,000 | 14,822.84 ops/sec | 13.38 ms | 16.35 ms | 16.45 ms | 0 |
| checkout_payment_intent_session | 25 | 500 | 12,809.04 ops/sec | 1.54 ms | 3.33 ms | 3.45 ms | 0 |
| checkout_payment_intent_session | 50 | 500 | 14,243.27 ops/sec | 2.99 ms | 4.81 ms | 4.81 ms | 0 |
| checkout_payment_intent_session | 100 | 500 | 13,899.31 ops/sec | 7.25 ms | 8.04 ms | 8.07 ms | 0 |

## Interpretation

The Core checkout architecture handled every tested independent-user workload with zero failures through:

- 200 concurrent cart mutations.
- 200 concurrent checkout reservation flows.
- 100 concurrent checkout PaymentIntent-session flows.

The PaymentIntent-session scenario adds pending-order and Stripe intent construction to reservation-only checkout. It deliberately stops before browser confirmation, webhook handling, and paid-order finalization, so it must not be used as a finalized-order throughput claim.

The single-user checkout limit is intentionally lower: one in-flight checkout per user. The lock key is `checkout_lock:{userId}`, so duplicate concurrent checkout attempts for the same user are supposed to reject or converge by idempotency instead of creating multiple orders.

## Production Capacity Notes

These results prove the local application orchestration path is not the immediate bottleneck at the tested concurrency levels. Production capacity still depends on external adapter behavior:

- Firestore transaction latency and contention are not included in these numbers.
- Stripe API latency, browser confirmation, and webhook delivery are not included.
- Hot inventory documents for the same product can reduce throughput because stock reservation is transactional.
- The Firestore order repository updates shared order stats during order creation and status changes; that shared write path should be load-tested with the Firestore emulator or staging before claiming sustained production order rates.
- API route session verification, rate limiting, hosting cold starts, and network overhead are not included.

For a production capacity claim, run the same workload against a deployed staging backend or the Firestore emulator with realistic latency, seeded inventory, and Stripe test-mode calls. Treat this benchmark as the repeatable Core baseline.
