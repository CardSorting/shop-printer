# Migrating from Shopify

Conceptual guide for merchants and integrators moving from **Shopify SaaS** to **self-hosted DreamBees Art**. This is not an automated migration tool — it is a map of what transfers, what changes, and what you rebuild.

**Customize after migration:** [customization.md](./customization.md) · **Operate:** [admin.md](./admin.md)

---

## What you gain

| Shopify limitation | DreamBees Art |
| --- | --- |
| Monthly platform fee + transaction fees | Pay only Stripe + infrastructure |
| Theme/Liquid constraints | Full React/TypeScript source |
| Opaque checkout | Inspectable checkout protocol + reconciliation |
| Vendor lock-in on data | Your Firestore project |
| App dependency for advanced ops | Fork and patch Core |

---

## What you lose (today)

| Shopify feature | DreamBees Art status |
| --- | --- |
| Theme marketplace | Source customization only |
| App store | Build or integrate via API/fork |
| Hosted checkout CDN | You operate Next.js + Firebase |
| Shopify Payments (non-Stripe) | Stripe integration |
| Multi-store admin | One deploy per merchant |
| Shopify POS | Not included |
| Built-in email marketing | Brevo + Concierge experiments |

Honest gaps: [platform-overview.md § Roadmap gaps](./platform-overview.md#roadmap-gaps-honest)

---

## Concept mapping

| Shopify | DreamBees Art |
| --- | --- |
| Online Store | Storefront (`src/app/`, `src/ui/`) |
| Admin | `/admin` + `services.admin` |
| Products | Firestore `products` + admin catalog |
| Variants | Product variant model |
| Collections | `collections` + taxonomy |
| Inventory | Protocol — catalog stock + locations + ledger |
| Orders | Firestore `orders` + checkout protocol |
| Customers | Firebase Auth + `users` + admin CRM |
| Discounts | `discounts` + cart validation |
| Checkout | `CheckoutApplicationService` + Stripe PI |
| Refunds | `RefundApplicationService` |
| Fulfillment | Admin fulfill + tracking import |
| Reports | `/admin/analytics` |
| Blog | Built-in blog CMS |
| Support | Tickets + KB + Concierge |

---

## Migration phases

### Phase 1 — Infrastructure (week 1)

1. Firebase project + Auth + Firestore
2. Stripe account (can start test mode)
3. Deploy DreamBees Art staging — [deployment.md](./deployment.md)
4. Rebrand — [customization.md](./customization.md)

### Phase 2 — Catalog (week 1–2)

| Shopify export | Approach |
| --- | --- |
| Products CSV | Script: CSV → admin API or seed loader |
| Images | Upload to Firebase Storage / admin files |
| Collections | Recreate in admin or import script |
| Metafields | Map to product metafield JSON |

Validate: storefront listing, SEO handles (`/products/[handle]`).

### Phase 3 — Operations (week 2)

| Area | Action |
| --- | --- |
| Shipping zones/rates | Recreate in admin settings |
| Discount codes | Recreate in `/admin/discounts` |
| Staff accounts | Firebase Auth users with `role: admin` |
| Support KB | Import articles to knowledgebase collections |

Train operators on [admin.md § Cookbook](./admin.md#operator-cookbook) — inventory batch adjust differs from Shopify inline edit.

### Phase 4 — Go-live (cutover)

1. Final catalog sync
2. DNS → production Firebase Hosting
3. Stripe **live** keys + webhook
4. Freeze Shopify checkout (maintenance mode)
5. Smoke purchase on production
6. Schedule cleanup cron — [runbook.md](./runbook.md)

Historical Shopify orders: optional read-only import for customer service — not required for greenfield launch.

---

## Data migration notes

| Entity | Recommendation |
| --- | --- |
| Products | Required — script or manual |
| Customers | Import if preserving logins; else fresh registration |
| Orders | Optional history; new checkout creates new order shape |
| Inventory | Set via PO receive or batch adjust — establishes ledger correctly |
| Gift cards | Not 1:1 — custom implementation needed |

**Do not** bulk-import stock by editing Firestore `product.stock` directly — use inventory protocol so ledger matches.

---

## Team training differences

| Shopify habit | DreamBees Art habit |
| --- | --- |
| Edit quantity on product page | Use `/admin/inventory` batch adjust |
| Refund in Shopify admin | Refund requires **reason** + elevation |
| Assume checkout always syncs | Monitor webhooks + reconciliation cases |
| Install app for feature | Patch source or build API integration |

Flow reference: [flows.md](./flows.md)

---

## Integrations you may rebuild

| Common Shopify app | DreamBees Art path |
| --- | --- |
| Email (Klaviyo) | Brevo + custom triggers (roadmap: webhooks) |
| Reviews | Built-in product reviews API |
| Shipping labels | Export CSV (Pirate Ship) + tracking import |
| Accounting | Export orders — custom script |
| ERP inventory | PO receive protocol + future webhook hooks |

---

## Cutover checklist

- [ ] Staging checkout end-to-end tested
- [ ] Production webhooks verified
- [ ] Operators trained on inventory + refund protocols
- [ ] [release-checklist.md](./release-checklist.md) complete
- [ ] Rollback DNS plan documented
- [ ] Customer comms (new account site URL if changed)

---

## Related

- [onboarding.md](./onboarding.md)
- [platform-overview.md](./platform-overview.md)
- [faq.md](./faq.md)
