# MeowAcc Documentation

Open-source, self-hosted ecommerce with Shopify-class storefront and admin.

| I want to… | Start here |
| --- | --- |
| Understand the project (2 min) | [brief.md](./brief.md) |
| Why we built it this way | [philosophy.md](./philosophy.md) |
| Full technical thesis | [whitepaper.md](./whitepaper.md) |
| Run locally first time | [onboarding.md](./onboarding.md) |
| Daily dev workflow | [local-development.md](./local-development.md) |
| Contribute | [../CONTRIBUTING.md](../CONTRIBUTING.md) |
| Rebrand / fork | [customization.md](./customization.md) |
| Leave Shopify | [migration-from-shopify.md](./migration-from-shopify.md) |
| Ship to production | [deployment.md](./deployment.md) → [release-checklist.md](./release-checklist.md) |
| Operate live store | [runbook.md](./runbook.md) |
| Debug something | [troubleshooting.md](./troubleshooting.md) · [faq.md](./faq.md) |
| One-screen lookup | [quick-reference.md](./quick-reference.md) |
| Storefront release gate | [storefront-release.md](./storefront-release.md) |
| Cart internals | [cart.md](./cart.md) |
| All four protocols | [protocols.md](./protocols.md) |

---

## Documentation map

```text
STRATEGY                      BUILD                         SHIP
────────                      ─────                         ────
brief.md                      architecture.md               deployment.md
philosophy.md                 protocols.md                  release-checklist.md
whitepaper.md                 flows.md                      runbook.md
platform-overview.md          data-model.md                 security.md
                              api-overview.md               testing.md
                              cart.md

START                         SURFACES                      POLICY
─────                         ────────                      ──────
onboarding.md                 storefront.md                 commerce-protocol-frozen.md
day-2.md                      storefront-release.md         checkout.md
local-development.md          admin.md                      inventory.md
getting-started.md            concierge/overview.md         refunds.md
environment-variables.md                                    CONTRIBUTING.md (repo root)
                                                            contributing-commerce.md

REFERENCE
─────────
glossary.md · faq.md · quick-reference.md · customization.md
migration-from-shopify.md · troubleshooting.md
```

---

## By role

### Developer

| When | Docs |
| --- | --- |
| Day 0 | [onboarding.md](./onboarding.md), [getting-started.md](./getting-started.md), [environment-variables.md](./environment-variables.md) |
| Daily | [local-development.md](./local-development.md), [quick-reference.md](./quick-reference.md) |
| Learning | [architecture.md](./architecture.md), [flows.md](./flows.md), [protocols.md](./protocols.md) |
| PR | [CONTRIBUTING.md](../CONTRIBUTING.md), [contributing-commerce.md](./contributing-commerce.md), [testing.md](./testing.md), [release-checklist.md](./release-checklist.md) |

### Merchant / operator

| When | Docs |
| --- | --- |
| First login | [onboarding.md § Operator](./onboarding.md#day-0-operator-checklist) |
| Daily tasks | [admin.md § Cookbook](./admin.md#operator-cookbook) |
| From Shopify | [migration-from-shopify.md](./migration-from-shopify.md) |
| Rebrand | [customization.md](./customization.md) |

### Production / SRE

| When | Docs |
| --- | --- |
| Deploy | [deployment.md](./deployment.md), [release-checklist.md](./release-checklist.md) |
| Operate | [runbook.md](./runbook.md) |
| Incidents | [troubleshooting.md](./troubleshooting.md) |
| Security | [security.md](./security.md) |

---

## All documents (A–Z)

| Doc | Summary |
| --- | --- |
| [admin.md](./admin.md) | Merchant console + operator cookbook |
| [api-overview.md](./api-overview.md) | HTTP route map |
| [architecture.md](./architecture.md) | Layers, diagrams, entities |
| [cart.md](./cart.md) | Canonical cart flow, guest storage, identity, merge, and verification |
| [checkout.md](./checkout.md) | Money capture protocol |
| [commerce-protocol-frozen.md](./commerce-protocol-frozen.md) | Mutation policy |
| [concierge/overview.md](./concierge/overview.md) | AI support |
| [CONTRIBUTING.md](../CONTRIBUTING.md) | Contribution guide |
| [contributing-commerce.md](./contributing-commerce.md) | Safe commerce extension guide |
| [customization.md](./customization.md) | Rebrand + UI fork guide |
| [data-model.md](./data-model.md) | Firestore collections |
| [day-2.md](./day-2.md) | Post-setup week 1 |
| [deployment.md](./deployment.md) | Production deploy |
| [environment-variables.md](./environment-variables.md) | Full env reference |
| [faq.md](./faq.md) | Common questions |
| [flows.md](./flows.md) | End-to-end stories |
| [getting-started.md](./getting-started.md) | Setup reference |
| [glossary.md](./glossary.md) | Terms |
| [inventory.md](./inventory.md) | Stock protocol |
| [local-development.md](./local-development.md) | Dev workflow + debugging |
| [migration-from-shopify.md](./migration-from-shopify.md) | Shopify migration map |
| [onboarding.md](./onboarding.md) | Day-0 guided path |
| [platform-overview.md](./platform-overview.md) | Scope vs Shopify |
| [protocols.md](./protocols.md) | Four protocols unified |
| [quick-reference.md](./quick-reference.md) | Cheat sheet |
| [production-readiness.md](./production-readiness.md) | Deploy gate, health endpoint, rollback |
| [operator-commerce-runtime.md](./operator-commerce-runtime.md) | Operator runtime model |
| [commerce-incident-runbook.md](./commerce-incident-runbook.md) | Commerce incident response |
| [refunds.md](./refunds.md) | Money reversal protocol |
| [release-checklist.md](./release-checklist.md) | Pre-release gate |
| [runbook.md](./runbook.md) | Production ops |
| [security.md](./security.md) | Auth, secrets, rules |
| [storefront.md](./storefront.md) | Customer shop |
| [storefront-release.md](./storefront-release.md) | Frozen storefront proof ladder |
| [testing.md](./testing.md) | Test suites |
| [troubleshooting.md](./troubleshooting.md) | Symptom fixes |

---

## Verification

```bash
npm test
npm run test:storefront-release          # catalog → payment proofs
npm run test:e2e:cart-smoke              # isolated cart-to-checkout journey
npm run test:e2e:checkout-smoke          # mocked checkout browser smoke
npm test -- --run src/tests/*-verification-ladder.test.ts
npm test -- --run src/tests/protocol-guard.test.ts
npm test -- --run src/tests/production-readiness.test.ts
npm run test:e2e
```

[testing.md](./testing.md) · [storefront-release.md](./storefront-release.md) · [release-checklist.md](./release-checklist.md)

---

## Legacy redirects

- [checkout-protocol-frozen.md](./checkout-protocol-frozen.md) → [commerce-protocol-frozen.md](./commerce-protocol-frozen.md)
- [woodbine-crm-whitepaper.md](./woodbine-crm-whitepaper.md) → [whitepaper.md](./whitepaper.md)

---

## Wiki

- [Knowledge ledger](../.wiki/index.md) · [Schemas](../.wiki/architecture/schemas.md) · [Admin access](../.wiki/admin-access.md)
