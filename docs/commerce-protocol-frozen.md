# Commerce Protocol — FROZEN

This document is the **architecture line** for DreamBees Art commerce mutations. DreamBees Art is an open-source, self-hosted ecommerce platform with Shopify-class surfaces; these rules keep money and stock paths caged regardless of merchant vertical or branding.

Do not extend behavior by calling raw services from routes, tools, admin actions, or automations.

---

## Core map

```txt
checkout  = money capture
refunds   = money reversal
inventory = stock movement
admin     = human authority
```

---

## Invariant

```txt
No route, tool, admin action, or automation touches raw money mutation services directly.
```

Examples of **forbidden** call sites:

- `refundService.processRefund()` from a route or Concierge handler
- `StripeService` from checkout routes (use `services.checkout`)
- `productRepo.batchUpdateStock()` from admin routes (use `services.inventory`)

Raw services are **infrastructure/internal**.

`ApplicationService` protocols are the **only public mutation boundary**.

---

## Entry points

New commerce behavior must enter through:

| Protocol | Service | Container key | Document |
| --- | --- | --- | --- |
| Money capture | `CheckoutApplicationService` | `services.checkout` | [checkout.md](./checkout.md) |
| Money reversal | `RefundApplicationService` | `services.refunds` | [refunds.md](./refunds.md) |
| Stock movement | `InventoryApplicationService` | `services.inventory` | [inventory.md](./inventory.md) |
| Human authority | `AdminApplicationService` | `services.admin` | [admin.md](./admin.md) |

**Delegation rules:**

- Admin **authorizes** operator actions; it does not reimplement Stripe or ledger logic.
- Admin refunds → `requestRefund` → `services.refunds.createRefund({ source: 'admin' })`
- Concierge refunds → `services.refunds.createRefund({ source: 'concierge' })`
- Admin stock changes → `services.admin` → `services.inventory`
- Checkout reservations → `services.checkout` → inventory mutation backend

---

## Result contracts

Each protocol returns a typed discriminated union (`*Result<T>`). Expected failures do not throw. Route adapters map codes to HTTP status.

Do not introduce parallel result shapes at the route layer.

---

## Proof ladders

Per-protocol verification is mandatory when changing behavior:

```bash
npm run test:storefront-release   # storefront + checkout + inventory reservation + payment
npm test -- --run \
  src/tests/checkout-verification-ladder.test.ts \
  src/tests/refund-verification-ladder.test.ts \
  src/tests/inventory-verification-ladder.test.ts \
  src/tests/admin-verification-ladder.test.ts \
  src/tests/protocol-guard.test.ts
```

Seal tests assert route-layer imports and protocol usage. Storefront lane map: [storefront-release.md](./storefront-release.md).

---

## Policy

1. Extend behavior **inside** flow services and protocol stacks.
2. Do **not** add parallel mutation entry points.
3. Do **not** bypass idempotency or actor/reason requirements on money reversal.
4. **Leave money paths alone** unless a new use case appears.

**Where does my change go?** [contributing-commerce.md § Decision tree](./contributing-commerce.md#decision-tree-where-does-my-change-go)

---

## Related

- [architecture.md](./architecture.md) — full layer model
- [platform-overview.md](./platform-overview.md) — product scope
