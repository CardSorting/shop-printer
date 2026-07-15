# Contributing to Commerce Core

How to extend DreamBees Art **without breaking frozen protocols**. Read [commerce-protocol-frozen.md](./commerce-protocol-frozen.md) first — this doc is the practical checklist.

---

## Golden rules

1. **Routes are thin** — parse, guard, delegate, adapt. No Stripe. No `batchUpdateStock`.
2. **Protocols return results** — use `*Result<T>`, don't throw for expected failures.
3. **Idempotency by default** — any retryable mutation needs a key and claim store.
4. **Update verification ladders** — if you change protocol behavior, update the matching `*-verification-ladder.test.ts`.
5. **Leave money paths alone** unless the use case is new and approved.

---

## Decision tree: where does my change go?

```text
Does it move money (charge or refund)?
├── YES → checkout or refunds protocol
│         Charge:  services.checkout
│         Refund:  services.refunds (admin via requestRefund)
└── NO
    Does it change sellable stock?
    ├── YES → services.inventory (admin may authorize via services.admin)
    └── NO
        Does it need operator authorization / audit?
        ├── YES → services.admin
        └── NO → appropriate read service or domain rule (ProductService, OrderQueryService, …)
```

| I need to… | Entry point | Never |
| --- | --- | --- |
| Add checkout step | `CheckoutFlowService` + flow module | Stripe in route |
| Change reserve timing | `checkoutClientStartFlow` / mutation service | Direct reservation repo in route |
| Add refund reason validation | `RefundFlowService` or `AdminFlowService` | `RefundService` from route |
| Restock on refund | `RefundService` → `inventory.applyInventoryDeltas` | Manual product stock PATCH |
| Admin bulk stock fix | `services.admin` → `adjustInventory` | `productRepo.batchUpdateStock` |
| PO receive | `PurchaseOrderService` → `receiveStockAtLocation` | `applyInventoryDeltas` from PO route |
| Concierge tool | `concierge/chat/route.ts` → protocol | Raw services |

---

## Adding a new API route

### Read-only route

```text
1. Create src/app/api/.../route.ts
2. requireSessionUser or public GET
3. Delegate to query service / repository via container
4. Return JSON (jsonError on failure)
5. Add route test if behavior is non-trivial
```

### Mutation route (commerce)

```text
1. Identify protocol (checkout | refunds | inventory | admin)
2. Add method to ApplicationService interface + FlowService if new public capability
3. Implement in flow module with *Result return
4. Wire in create*Stack factory if new dependency
5. Route: guard → parse → services.{protocol}.method → route adapter
6. Add verification ladder test + seal test if new entry point
```

### Anti-pattern (will fail review)

```typescript
// ❌ Route calling Stripe directly
const stripe = getStripeService();
await stripe.refund(...);

// ✅ Admin route
const result = await services.admin.requestRefund({ actor, orderId, amount, reason, idempotencyKey });
```

---

## Protocol change checklist

Before opening a PR that touches `src/core/order/`, `src/core/inventory/`, `src/core/refund/`, or `src/core/admin/`:

- [ ] Change is inside FlowService or flow module, not a new route shortcut
- [ ] Public method returns `*Result<T>` with correct error codes
- [ ] Idempotency considered (new claim collection or existing marker)
- [ ] Route adapter maps new codes to HTTP statuses
- [ ] Structured logs include correlation ids
- [ ] Verification ladder test added or updated
- [ ] Seal test confirms routes don't import forbidden services
- [ ] [flows.md](./flows.md) updated if user-visible story changed
- [ ] No change to frozen policy without explicit intent

Run:

```bash
npm run test:storefront-release   # if storefront/cart/checkout touched
npm test -- --run src/tests/*-verification-ladder.test.ts
npm run typecheck
npm run lint
```

---

## UI changes

| Area | Path | Rule |
| --- | --- | --- |
| Storefront | `src/ui/pages/`, `src/ui/components/` | Use `apiClientServices.ts` |
| Admin | `src/ui/pages/admin/` | Same — no Firestore SDK |
| Checkout UI | `src/ui/checkout/`, `CheckoutPage` | `gateCheckoutCommit` + `services.checkout` only |
| Cart UI | `src/ui/hooks/useCart.tsx` | Import `@core/cart/cartMutations` — not `@core/cart` barrel |

Admin inventory UI already sends idempotency keys — follow that pattern for new batch mutations.

---

## Testing layers

| Layer | When | Command |
| --- | --- | --- |
| Storefront release | Cart, checkout, catalog, PDP | `npm run test:storefront-release` |
| Protocol unit | Every protocol change | `npm test -- --run src/tests/checkout-verification-ladder.test.ts` |
| Production proof | Lane invariant | `*-production-proof.test.ts`, `*-reservation-proof.test.ts` |
| Flow integration | Complex workflow | `npm test -- --run src/tests/checkout-flow-service.test.ts` |
| Financial recovery | Payment edge cases | `npm test -- --run src/tests/financial-recovery-hardening.test.ts` |
| E2E cart smoke | Cart UI, guest storage, merge, handoff | `npm run test:e2e:cart-smoke` |
| E2E checkout smoke | Checkout UI | `npm run test:e2e:checkout-smoke` |
| E2E full | Broader UI regression | `npm run test:e2e` |
| Benchmark | Performance | `npm run benchmark:order-flow` |

In-memory helpers: `src/tests/helpers/inMemory*.ts` — use in protocol tests, not production wiring.

---

## Documentation expectations

| Change type | Update |
| --- | --- |
| New public protocol method | `checkout.md` / `inventory.md` / `refunds.md` + [api-overview.md](./api-overview.md) |
| New operator workflow | [flows.md](./flows.md) + [admin.md](./admin.md) |
| New env var | [getting-started.md](./getting-started.md) |
| New term | [glossary.md](./glossary.md) |
| Setup change | [onboarding.md](./onboarding.md) |

---

## Code review questions

Ask these of any commerce PR:

1. Can this mutation be retried safely without double effect?
2. Does every failure path return a typed result (not throw) at the protocol boundary?
3. Is there a test that would fail if someone later imported `refundService` in a route?
4. Does an operator know what happened from logs/audit?
5. Is this the smallest change that solves the use case?

---

## Related

- [commerce-protocol-frozen.md](./commerce-protocol-frozen.md)
- [architecture.md](./architecture.md)
- [troubleshooting.md](./troubleshooting.md)
- [day-2.md](./day-2.md)
