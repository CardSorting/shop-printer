# Admin Console

The DreamBees Art **merchant admin** is the operator control plane — analogous to Shopify Admin. It covers catalog, orders, inventory, customers, marketing, content, support, and store settings. Admin screens call API routes; API routes delegate to Core services, with **mutations** flowing through `AdminApplicationService` and commerce protocols.

---

## Navigation map

Admin IA follows Shopify-familiar groupings (`src/ui/navigation/adminNavigation.ts`):

| Section | Routes | Operator jobs |
| --- | --- | --- |
| **Home** | `/admin`, `/admin/ops` | Dashboard, setup progress, suggested actions |
| **Orders** | `/admin/orders`, `/admin/orders/[id]` | Review, fulfill, refund, reconcile, notes, tracking |
| **Products** | `/admin/products`, bulk edit, new/edit | Catalog, pricing, variants, metafields |
| **Inventory** | `/admin/inventory` | Stock levels, adjustments, ledger, transfers |
| **Locations** | `/admin/locations` | Warehouses / retail locations |
| **Receiving** | `/admin/purchase-orders` | PO create, submit, receive |
| **Customers** | `/admin/customers` | Profiles, order history, edits |
| **Discounts** | `/admin/discounts` | Codes and campaigns |
| **Collections** | `/admin/collections` | Manual collections |
| **Taxonomy** | `/admin/taxonomy` | Categories and product types |
| **Shipping** | Settings sections | Zones, classes, rates |
| **Analytics** | `/admin/analytics` | Sales and traffic signals |
| **SEO** | `/admin/seo` | Search listing health |
| **Support** | `/admin/support`, `/admin/tickets` | Tickets, KB, macros, health |
| **Concierge** | `/admin/concierge` | AI session triage and insights |
| **Content** | `/admin/blog` | Posts, authors, comments, subscribers |
| **Files** | `/admin/files` | Media library |
| **Audit** | `/admin/audit` | Operator action history |
| **Settings** | `/admin/settings` | Store configuration |

Command palette (`SearchCommandPalette`) indexes the same taxonomy for keyboard-first navigation.

---

## Protocol boundary

Admin is **human authority**, not a second checkout engine.

```text
Admin HTTP route
  → services.admin.*           (AdminApplicationService)
  → AdminResult<T>
  → adminRouteAdapter
```

| Mutation type | Path |
| --- | --- |
| Product create/update/archive | `services.admin` → `ProductAdminService` |
| Inventory batch adjust | `services.admin` → `services.inventory` |
| PO receive / submit / cancel | `services.admin` |
| Order status, fulfill, reconcile | `services.admin` → `OrderService` (authorized) |
| Refund | `services.admin.requestRefund` → `services.refunds.createRefund` |
| Location CRUD | `services.admin` |
| Reconciliation operator action | `services.admin` or checkout protocol where specified |

**Rule:** Admin routes do not import `refundService`, `StripeService`, or call `productRepo.batchUpdateStock` directly.

Verification: `src/tests/admin-verification-ladder.test.ts`

---

## Orders workflow

Typical operator flow (Shopify-parity):

```text
New order → Review → Pick/pack → Fulfill → Tracking → Closed
                ↓
         Refund / partial refund (elevated + reason)
                ↓
         Reconciliation case (automation mismatch)
```

| Action | Admin API | Notes |
| --- | --- | --- |
| List / filter | `GET /api/admin/orders` | Dashboard metrics |
| Detail | `GET /api/admin/orders/[id]` | Line items, timeline |
| Status update | `PATCH /api/admin/orders/[id]` | Via `services.admin` |
| Fulfill | `POST .../fulfillment` | Shipping labels external |
| Refund | `POST .../refund` | Idempotency key required |
| Notes | `POST .../notes` | Internal + customer-visible |
| Reconcile | `POST .../reconcile` | Payment mismatch cases |
| Export CSV | `GET .../export/pirate-ship` | Shipping tool integration |
| Import tracking | `POST .../import/tracking` | Bulk tracking upload |

Recovery and cleanup jobs: `POST /api/admin/orders/recovery`, system `cleanup-orders` (checkout protocol).

---

## Catalog and products

| Feature | Route / service |
| --- | --- |
| Product CRUD | `/api/admin/products`, overview views |
| Bulk edit | `/admin/products/bulk-edit`, batch API |
| Metafields | Product model + admin forms |
| Digital vs physical | Product type drives fulfillment and vault |
| Archive | Soft-delete via admin protocol |

Product PATCH **rejects** direct `stock` changes — use inventory batch adjust.

---

## Inventory and receiving

Operator inventory work mirrors Shopify Admin + Stocky patterns:

| Job | Surface |
| --- | --- |
| Adjust on-hand | Admin inventory batch → `services.inventory` |
| View ledger | `/api/admin/inventory/ledger` |
| Transfers | `/api/admin/inventory/transfers` |
| Reconcile discrepancies | `/api/admin/inventory/reconcile` |
| PO lifecycle | Purchase orders admin → receive fans out to locations |

Protocol reference: [inventory.md](./inventory.md)

---

## Customers and discounts

| Area | Capabilities |
| --- | --- |
| Customers | List, create, edit, order history cross-link |
| Discounts | Percentage/fixed codes, usage limits, validation at cart |

---

## Support CRM

| Feature | Implementation |
| --- | --- |
| Tickets | Status, priority, properties, assignment |
| Knowledge base | Categories, articles (public + admin) |
| Macros | Canned replies for agents |
| Health | Support queue health endpoint |
| Customer summary | Per-user support context for agents |

Concierge sessions link into the same operational data model.

---

## Content and marketing

| Area | Routes |
| --- | --- |
| Blog CMS | `/admin/blog`, generate/sync helpers |
| Campaigns | `/api/admin/marketing/campaigns` |
| Concierge strategy | Marketing strategy analysis endpoints |
| Navigation editor | `/admin/navigation` |

---

## Security and audit

| Mechanism | Behavior |
| --- | --- |
| Admin session | Required on all `/api/admin/*` mutations |
| Elevation | Destructive actions (refunds, bulk ops) require elevated actor |
| Reason | Refunds and sensitive mutations require operator reason string |
| Idempotency | Client-supplied keys on refunds and batch mutations |
| Audit log | `/admin/audit`, `AuditService` records |
| Operator events | `FirestoreAdminOperatorEventLog` for admin protocol dedup |

---

## Settings

`/admin/settings/[section]` covers store profile, payments, shipping, notifications, SEO, and feature flags. Settings persist via `SettingsService` and Firestore.

---

## Related docs

- [architecture.md](./architecture.md) — Admin in the layer model
- [refunds.md](./refunds.md) — refund protocol
- [inventory.md](./inventory.md) — stock protocol
- [concierge/overview.md](./concierge/overview.md) — AI operator tools
