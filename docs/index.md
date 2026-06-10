# DreamBees Art Documentation

Open-source, self-hosted ecommerce with Shopify-class storefront and admin. You run Firebase and Stripe; the codebase is the platform.

**New developer?** [onboarding.md](./onboarding.md) → [day-2.md](./day-2.md)  
**Something broken?** [troubleshooting.md](./troubleshooting.md)

---

## Documentation map

```text
                         onboarding.md
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
        day-2.md      getting-started    platform-overview
              │               │               │
              └───────┬───────┴───────┬───────┘
                      ▼               ▼
                 architecture      flows.md
                      │               │
         ┌────────────┼───────────────┼────────────┐
         ▼            ▼               ▼            ▼
   checkout.md  inventory.md    refunds.md    admin.md
         │            │               │            │
         └────────────┴───────────────┴────────────┘
                      │
              commerce-protocol-frozen
                      │
         ┌────────────┼────────────┐
         ▼            ▼            ▼
   api-overview  glossary   contributing-commerce
         │            │            │
         └────────────┴────────────┘
                 troubleshooting.md
```

---

## By role

### Developer (first week)

| Day | Document | Outcome |
| --- | --- | --- |
| 0 | [Onboarding](./onboarding.md) | Local store + test checkout |
| 1 | [Day 2](./day-2.md) | Code map, safe first change |
| 2 | [Architecture](./architecture.md) + [Flows](./flows.md) | Mental model |
| 3 | [Contributing commerce](./contributing-commerce.md) | Protocol rules |
| 4–5 | [Checkout](./checkout.md) + [Inventory](./inventory.md) | Reference when coding |

### Merchant operator

| Document | Outcome |
| --- | --- |
| [Onboarding § Operator](./onboarding.md#day-0-operator-checklist) | Admin login |
| [Admin § Cookbook](./admin.md#operator-cookbook) | Fulfill, refund, receive, reconcile |
| [Flows](./flows.md) | What happens behind the UI |

### Architect / reviewer

| Document | Outcome |
| --- | --- |
| [Platform overview](./platform-overview.md) | Scope vs Shopify |
| [Architecture](./architecture.md) | Layers + entity model |
| [Commerce protocol — FROZEN](./commerce-protocol-frozen.md) | Invariants |
| [API overview](./api-overview.md) | Surface area |

---

## Core documents

| Document | Contents |
| --- | --- |
| [Onboarding](./onboarding.md) | Day-0 checklist, first purchase, mental model |
| [Day 2](./day-2.md) | Post-setup developer + operator tasks |
| [Getting started](./getting-started.md) | Env reference, deploy |
| [Platform overview](./platform-overview.md) | Shopify map, gaps, branding |
| [Architecture](./architecture.md) | Layers, diagrams, entities |
| [Flows](./flows.md) | End-to-end commerce stories |
| [Troubleshooting](./troubleshooting.md) | Symptom-first fixes |
| [Commerce protocol — FROZEN](./commerce-protocol-frozen.md) | Mutation policy |

---

## Reference

| Document | Contents |
| --- | --- |
| [API overview](./api-overview.md) | Route map, auth conventions |
| [Glossary](./glossary.md) | Terms and definitions |
| [Contributing commerce](./contributing-commerce.md) | PR checklist, decision tree |
| [Checkout](./checkout.md) | Money capture protocol |
| [Inventory](./inventory.md) | Stock movement protocol |
| [Refunds](./refunds.md) | Money reversal protocol |
| [Admin](./admin.md) | Merchant console + cookbook |
| [Storefront](./storefront.md) | Customer surface |
| [Concierge](./concierge/overview.md) | AI support layer |

---

## Verification

```bash
npm test

npm test -- --run \
  src/tests/checkout-verification-ladder.test.ts \
  src/tests/refund-verification-ladder.test.ts \
  src/tests/inventory-verification-ladder.test.ts \
  src/tests/admin-verification-ladder.test.ts

npm run benchmark:order-flow
npm run test:e2e
```

---

## Legacy redirects

- [checkout-orchestration.md](./checkout-orchestration.md) → [checkout.md](./checkout.md)
- [checkout-protocol-frozen.md](./checkout-protocol-frozen.md) → [checkout.md](./checkout.md) §13 + [commerce-protocol-frozen.md](./commerce-protocol-frozen.md)
- [woodbine-crm-whitepaper.md](./woodbine-crm-whitepaper.md) → [platform-overview.md](./platform-overview.md)

---

## Wiki

- [Knowledge ledger](../.wiki/index.md)
- [Schemas](../.wiki/architecture/schemas.md)
- [Admin access](../.wiki/admin-access.md)
