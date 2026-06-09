# Order Flow Throughput Benchmark

Last measured: May 21, 2026 at 01:26 MDT.

This benchmark measures the backend order-flow architecture at the Core service boundary. It exercises the actual `CartService` and `OrderService` orchestration with in-memory repositories and a mocked Firebase transaction bridge, so the numbers are a local upper bound for application orchestration logic. They are not a production Firestore or Stripe network-capacity claim.

## What Was Tested

Command:

```bash
npm run benchmark:order-flow
```

Benchmark source:

- `src/tests/order-flow-throughput.benchmark.test.ts`
- Latest raw output: `.wiki/architecture/order-flow-throughput-results.json`

Covered flows:

- `cart_add_to_cart`: `CartService.addToCart`, including transactional product lookup, cart read, cart rule evaluation, and cart save.
- `checkout_reservation_only`: `services.checkout.reserveCheckout`, including checkout lock, cart read, product verification, stock reservation, order creation, checkout-attempt recording, cart clear, and audit call.
- `full_order_payment_finalize`: `services.checkout.completeWithPaymentMethod`, including all reservation steps, payment-processor call, PaymentIntent mapping, payment finalization, payment/fulfillment/reconciliation state transitions, checkout-attempt completion, and fulfillment event append.

Runner:

- Node: `v23.5.0`
- Vitest/jsdom
- Mocked Firebase transaction bridge
- In-memory cart, product, order, lock, discount, audit, and payment adapters

## Result Summary

Maximum clean concurrency tested:

| Flow | Max clean concurrency tested | Operations tested at that concurrency | Throughput | p95 latency | Failures |
| --- | ---: | ---: | ---: | ---: | ---: |
| Cart add-to-cart | 200 | 2,000 | 31,150.57 ops/sec | 7.40 ms | 0 |
| Checkout reservation | 200 | 1,000 | 22,495.54 ops/sec | 10.39 ms | 0 |
| Full order + payment finalization | 100 | 500 | 11,125.71 ops/sec | 9.47 ms | 0 |

## Full Results

| Scenario | Concurrency | Operations | Throughput | p50 | p95 | p99 | Failures |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| cart_add_to_cart | 25 | 2,000 | 26,243.62 ops/sec | 0.66 ms | 3.22 ms | 3.87 ms | 0 |
| cart_add_to_cart | 50 | 2,000 | 26,224.76 ops/sec | 1.24 ms | 5.36 ms | 7.00 ms | 0 |
| cart_add_to_cart | 100 | 2,000 | 23,862.18 ops/sec | 2.54 ms | 11.45 ms | 20.57 ms | 0 |
| cart_add_to_cart | 200 | 2,000 | 31,150.57 ops/sec | 7.04 ms | 7.40 ms | 7.51 ms | 0 |
| checkout_reservation_only | 25 | 1,000 | 18,651.73 ops/sec | 0.85 ms | 3.85 ms | 6.19 ms | 0 |
| checkout_reservation_only | 50 | 1,000 | 23,873.78 ops/sec | 1.54 ms | 4.02 ms | 4.08 ms | 0 |
| checkout_reservation_only | 100 | 1,000 | 24,591.60 ops/sec | 3.05 ms | 5.77 ms | 5.77 ms | 0 |
| checkout_reservation_only | 200 | 1,000 | 22,495.54 ops/sec | 8.60 ms | 10.39 ms | 10.39 ms | 0 |
| full_order_payment_finalize | 25 | 500 | 10,583.79 ops/sec | 1.70 ms | 4.04 ms | 4.15 ms | 0 |
| full_order_payment_finalize | 50 | 500 | 11,929.32 ops/sec | 3.26 ms | 5.93 ms | 5.94 ms | 0 |
| full_order_payment_finalize | 100 | 500 | 11,125.71 ops/sec | 8.92 ms | 9.47 ms | 9.47 ms | 0 |

## Interpretation

The Core checkout architecture handled every tested independent-user workload with zero failures through:

- 200 concurrent cart mutations.
- 200 concurrent checkout reservation flows.
- 100 concurrent full order/payment/finalization flows.

The full order flow is roughly half the throughput of reservation-only checkout because it does additional payment mapping, finalization, state transitions, metadata updates, and fulfillment-event writes.

The single-user checkout limit is intentionally lower: one in-flight checkout per user. The lock key is `checkout_lock:{userId}`, so duplicate concurrent checkout attempts for the same user are supposed to reject or converge by idempotency instead of creating multiple orders.

## Production Capacity Notes

These results prove the local application orchestration path is not the immediate bottleneck at the tested concurrency levels. Production capacity still depends on external adapter behavior:

- Firestore transaction latency and contention are not included in these numbers.
- Stripe API latency and webhook delivery are not included.
- Hot inventory documents for the same product can reduce throughput because stock reservation is transactional.
- The Firestore order repository updates shared order stats during order creation and status changes; that shared write path should be load-tested with the Firestore emulator or staging before claiming sustained production order rates.
- API route session verification, rate limiting, hosting cold starts, and network overhead are not included.

For a production capacity claim, run the same workload against a deployed staging backend or the Firestore emulator with realistic latency, seeded inventory, and Stripe test-mode calls. Treat this benchmark as the repeatable Core baseline.

