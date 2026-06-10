# API Overview

HTTP API map for DreamBees Art. Routes are thin transport: they **guard**, **parse**, **delegate** to Core services, and **adapt** typed results to JSON.

**Auth model:** signed HTTP-only session cookie (Firebase-backed user). Admin routes require `role: admin`. Destructive admin ops may require elevation or step-up.

Full guard implementations: `src/infrastructure/server/apiGuards.ts`

---

## Conventions

| Convention | Detail |
| --- | --- |
| **Base URL** | Same origin as storefront (`NEXT_PUBLIC_SITE_URL`) |
| **Mutations** | POST/PATCH/DELETE — `assertTrustedMutationOrigin` |
| **Idempotency** | Checkout, refunds, inventory batch, many admin mutations require `idempotencyKey` |
| **Errors** | `{ error, code, retryable? }` from route adapters |
| **Rate limits** | Applied per-route (auth, checkout, concierge) |

---

## Public storefront APIs

No admin role. Session optional unless noted.

### Catalog & discovery

| Method | Route | Purpose |
| --- | --- | --- |
| GET | `/api/products` | Product list |
| GET | `/api/products/[id]` | Product by id |
| GET | `/api/products/handle/[handle]` | Product by handle |
| GET | `/api/collections/[handle]` | Collection + products |
| GET | `/api/navigation` | Store navigation menu |
| GET | `/api/taxonomy/categories` | Category tree |
| GET | `/api/shipping/rates` | Quote shipping (checkout) |
| GET | `/api/shipping/zones` | Zone config (public read) |

### Cart

| Method | Route | Purpose |
| --- | --- | --- |
| GET | `/api/cart` | Load cart |
| POST | `/api/cart` | Create/update cart |
| POST/PATCH/DELETE | `/api/cart/items` | Line items |
| POST | `/api/cart/note` | Cart note |

### Checkout & orders

| Method | Route | Protocol / service |
| --- | --- | --- |
| POST | `/api/checkout/create-payment-intent` | `services.checkout.createCheckoutSession` |
| GET | `/api/checkout/verify` | `services.checkout.recoverPendingOrder` |
| POST | `/api/orders` | `services.checkout.completeCheckoutWithPaymentMethod` |
| GET | `/api/orders` | Order list (session required) |
| POST | `/api/discounts/validate` | Discount validation |

### Account & engagement

| Method | Route | Purpose |
| --- | --- | --- |
| POST | `/api/auth/sign-in` | Session create |
| POST | `/api/auth/sign-up` | Registration |
| POST | `/api/auth/sign-out` | Session destroy |
| POST | `/api/auth/forgot-password` | Reset email |
| GET/POST | `/api/wishlists` | Wishlist CRUD |
| GET | `/api/account/vault` | Digital assets |
| GET | `/api/tracking/[id]` | Shipment tracking |

### Support & content

| Method | Route | Purpose |
| --- | --- | --- |
| GET | `/api/support/categories` | Help categories |
| GET | `/api/support/articles/[slug]` | KB article |
| POST | `/api/tickets` | Create ticket |
| POST | `/api/tickets/[id]/messages` | Reply |
| GET | `/api/blog/*` | Blog public reads |
| POST | `/api/concierge/chat` | AI chat + tools |
| GET/POST | `/api/concierge/sessions` | Session management |

---

## Webhooks & system jobs

| Method | Route | Auth | Purpose |
| --- | --- | --- | --- |
| POST | `/api/webhooks/stripe` | Stripe signature | `services.checkout.handleCheckoutWebhook` |
| POST | `/api/system/cleanup-orders` | Bearer / internal | Expired pending orders + inventory cleanup |
| POST | `/api/system/cleanup-inventory` | Bearer / internal | Expired reservations |

System routes use configured bearer tokens — not for browser clients.

---

## Admin APIs (`/api/admin/*`)

Require `requireAdminSession`. Mutations delegate to `services.admin` and commerce protocols.

### Orders & money

| Method | Route | Delegates to |
| --- | --- | --- |
| GET | `/api/admin/orders` | Order query |
| GET/PATCH | `/api/admin/orders/[id]` | `services.admin` (refund path → `requestRefund`) |
| POST | `/api/admin/orders/[id]/refund` | `services.admin.requestRefund` |
| POST | `/api/admin/orders/[id]/fulfillment` | `services.admin.fulfillOrder` |
| POST | `/api/admin/orders/[id]/notes` | `services.admin.addOrderNote` |
| POST | `/api/admin/orders/[id]/reconcile` | `services.admin.reconcileOrder` |
| POST | `/api/admin/reconciliation/cases` | Checkout operator / admin |
| GET | `/api/admin/dashboard` | Dashboard aggregates |

### Catalog & inventory

| Method | Route | Delegates to |
| --- | --- | --- |
| GET/POST | `/api/admin/products/*` | `services.admin` / product admin |
| POST | `/api/admin/products/batch` | Batch product ops |
| POST | `/api/admin/inventory/batch` | `services.inventory.adjustInventory` |
| POST | `/api/admin/inventory/reconcile` | `services.inventory.reconcileInventory` |
| GET | `/api/admin/inventory/ledger` | `services.inventory.getProductLedger` |
| GET/POST | `/api/admin/purchase-orders/*` | PO + receive → inventory |
| GET/POST | `/api/admin/locations/*` | Location admin |

### Customers, marketing, support

| Method | Route | Purpose |
| --- | --- | --- |
| GET/POST | `/api/admin/customers/*` | Customer CRM |
| GET/POST | `/api/admin/discounts/*` | Discount admin |
| GET/POST | `/api/admin/tickets/*` | Support tickets |
| GET/POST | `/api/admin/marketing/campaigns` | Campaigns |
| GET/POST | `/api/admin/concierge/*` | Concierge operator |
| GET | `/api/admin/audit` | Audit log |

### Content & store config

| Method | Route | Purpose |
| --- | --- | --- |
| `/api/admin/blog/*` | Blog CMS |
| `/api/admin/collections/*` | Collections |
| `/api/admin/taxonomy/*` | Categories/types |
| `/api/admin/shipping/*` | Zones, classes, rates |
| `/api/admin/settings/*` | Store settings |
| `/api/admin/upload`, `/api/admin/media` | Media |
| `/api/admin/seo/snapshot` | SEO health |

Complete route list: `src/app/api/**/route.ts` (~142 files).

---

## Protocol-only mutations

These operations **must not** be exposed as raw service calls. Always go through the protocol column:

| Operation | Protocol | Example route |
| --- | --- | --- |
| Capture payment | `services.checkout` | `create-payment-intent`, webhook |
| Refund | `services.refunds` (via admin/concierge) | `admin/orders/.../refund` |
| Move stock | `services.inventory` | `admin/inventory/batch` |
| Authorize admin action | `services.admin` | Most `/api/admin/*` mutations |

---

## Client access from UI

Browser code should use `src/ui/apiClientServices.ts` — typed wrappers over fetch with credentials and error handling. Do not call Firestore from React components.

---

## Related

- [storefront.md](./storefront.md) — customer-facing surface
- [admin.md](./admin.md) — operator surface
- [checkout.md](./checkout.md) · [inventory.md](./inventory.md) · [refunds.md](./refunds.md) — protocol detail
- [architecture.md § Read vs write](./architecture.md#read-path-vs-write-path)
