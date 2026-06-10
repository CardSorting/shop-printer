# DreamBees Art Documentation

DreamBees Art is an **open-source, self-hosted ecommerce platform** with Shopify-class storefront and admin capabilities. You run it on your own Firebase and Stripe accounts; the codebase is the product.

This directory holds long-form technical documentation. Day-to-day operational notes live in [.wiki/index.md](../.wiki/index.md).

---

## Start here

| Document | Read when you need to… |
| --- | --- |
| [Platform overview](./platform-overview.md) | Understand scope, Shopify comparison, and feature map |
| [Getting started](./getting-started.md) | Install, configure env, seed, and verify locally |
| [Architecture](./architecture.md) | Learn layers, commerce protocols, and request flow |
| [Commerce protocol — FROZEN](./commerce-protocol-frozen.md) | Know the mutation boundary rules (do not bypass) |

---

## Merchant surfaces

| Document | Read when you need to… |
| --- | --- |
| [Storefront](./storefront.md) | Customer shopping, account, checkout UX, public APIs |
| [Admin](./admin.md) | Merchant console: catalog, orders, inventory, support |
| [Concierge](./concierge/overview.md) | AI-assisted support, chat tools, operator workspace |

---

## Commerce protocols (reference)

These documents describe **frozen application boundaries**. Extend behavior inside flow services — do not add parallel mutation entry points.

| Protocol | Service | Document |
| --- | --- | --- |
| Money capture | `CheckoutApplicationService` | [Checkout](./checkout.md) |
| Money reversal | `RefundApplicationService` | [Refunds](./refunds.md) |
| Stock movement | `InventoryApplicationService` | [Inventory](./inventory.md) |
| Human authority | `AdminApplicationService` | [Admin](./admin.md) § Protocol boundary |

Legacy redirects:

- [checkout-orchestration.md](./checkout-orchestration.md) → [checkout.md](./checkout.md)
- [checkout-protocol-frozen.md](./checkout-protocol-frozen.md) → [checkout.md](./checkout.md) §13
- [woodbine-crm-whitepaper.md](./woodbine-crm-whitepaper.md) → [platform-overview.md](./platform-overview.md)

---

## Verification commands

```bash
# Full suite
npm test

# Commerce protocol ladders
npm test -- --run \
  src/tests/checkout-verification-ladder.test.ts \
  src/tests/refund-verification-ladder.test.ts \
  src/tests/inventory-verification-ladder.test.ts \
  src/tests/admin-verification-ladder.test.ts

# Core throughput baseline (in-memory adapters)
npm run benchmark:order-flow

# End-to-end storefront flows
npm run test:e2e
```

---

## Related wiki

- [Project state](../.wiki/architecture/project-state.md)
- [Directory dictionary](../.wiki/architecture/directories.md)
- [Order flow throughput](../.wiki/architecture/order-flow-throughput.md)
- [Onboarding walkthrough](../.wiki/onboarding/walkthrough.md)
