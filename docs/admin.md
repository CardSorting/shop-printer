# Admin Console

The DreamBees Art **merchant admin** is the operator control plane — analogous to Shopify Admin. It covers catalog, orders, inventory, customers, marketing, content, support, and store settings. Admin screens call API routes; API routes delegate to Core services, with **mutations** flowing through `AdminApplicationService` and commerce protocols.

**Operator onboarding:** [onboarding.md § Operator checklist](./onboarding.md#day-0-operator-checklist) · **End-to-end stories:** [flows.md](./flows.md)

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

### Keyboard shortcuts

Shortcuts use **`G` then letter** (Go navigation pattern):

| Keys | Destination |
| --- | --- |
| `G` `H` | Home / dashboard |
| `G` `R` | Orders |
| `G` `P` | Products |
| `G` `O` | Planning / ops |

Additional shortcuts defined on items in `src/ui/navigation/adminNavigation.ts`. Open command palette from admin header for searchable navigation and aliases (e.g. type "stock" → Inventory).

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

## Operator cookbook

Step-by-step recipes for common Shopify-parity jobs. Each lists UI path, protocol touched, and doc deep-dive.

### Fulfill an order

| Step | Action |
| ---: | --- |
| 1 | `/admin/orders` → open order |
| 2 | Confirm payment status paid/processing |
| 3 | Pick/pack items |
| 4 | **Fulfill** → enter tracking if available |
| 5 | Customer sees update on `/orders/[id]` |

Protocol: `services.admin.fulfillOrder` · API: `POST .../fulfillment`

### Issue a partial refund

| Step | Action |
| ---: | --- |
| 1 | Open order in admin |
| 2 | Ensure session is **elevated** (step-up if prompted) |
| 3 | Refund → enter amount in cents/dollars per UI |
| 4 | Enter **reason** (required) |
| 5 | Submit — UI sends idempotency key |

Protocol: `admin.requestRefund` → `refunds.createRefund` · [refunds.md](./refunds.md)

Retry with same key is safe (no double refund).

### Adjust stock after a count

| Step | Action |
| ---: | --- |
| 1 | `/admin/inventory` |
| 2 | Select products/locations to adjust |
| 3 | Enter new quantity or delta per UI |
| 4 | Submit batch — client generates idempotency key |

Protocol: `services.admin` → `inventory.adjustInventory` · **Not** product edit form stock field

### Receive a purchase order

| Step | Action |
| ---: | --- |
| 1 | `/admin/purchase-orders` → open PO |
| 2 | **Receive** → enter quantities per line + location |
| 3 | Submit once — note idempotency for retries |
| 4 | Verify catalog + location in inventory views |
| 5 | Optional: `GET ledger?productId=` for audit trail |

Protocol: `receiveStockAtLocation` · [flows.md § Receive stock](./flows.md#receive-stock-flow-purchase-order)

### Resolve a stuck payment

| Step | Action |
| ---: | --- |
| 1 | Find order stuck **pending** with Stripe charge succeeded |
| 2 | Open reconciliation / order forensic view |
| 3 | If case `paid_not_finalized` → **retry recovery** with reason |
| 4 | Confirm order moves to paid; reservation committed |

Protocol: `services.checkout.handleReconciliationOperatorAction` · [troubleshooting.md § Webhooks](./troubleshooting.md#webhooks--finalization)

### Handle a support ticket

| Step | Action |
| ---: | --- |
| 1 | `/admin/tickets` → assign to self |
| 2 | Review customer + order context |
| 3 | Reply using macro or custom message |
| 4 | Close or escalate; link Concierge session if applicable |

Read-only order context uses query services — refunds still go through refund protocol.

---

## Related docs

- [architecture.md](./architecture.md) — Admin in the layer model
- [refunds.md](./refunds.md) — refund protocol
- [inventory.md](./inventory.md) — stock protocol
- [concierge/overview.md](./concierge/overview.md) — AI operator tools
