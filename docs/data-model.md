# Data Model

Firestore collections used by MeowAcc runtime commerce. This is a **practical map**, not an exhaustive schema — field detail lives in `src/domain/models.ts` and [.wiki/architecture/schemas.md](../.wiki/architecture/schemas.md).

Persistence: **Firestore only** for production commerce (SQLite env vars are legacy/seed tooling references).

---

## Collection map

```text
CATALOG                    COMMERCE                 PROTOCOL / AUDIT
────────                   ────────                 ────────────────
products                   orders                   stripe_webhook_events
collections                carts                    checkout_recovery_attempts
product_categories         discounts                operator_action_events
product_types              purchase_orders          refund_execution_claims
suppliers                  inventory_locations      refund_execution_events
                           inventory_levels         admin_mutation_claims
                           inventory_ledger         admin_operator_events
                           inventory_reservations*
                           reconciliation_cases*

USERS & CRM                SUPPORT & CONTENT        SYSTEM
──────────                 ─────────────────        ──────
users                      support_tickets          rate_limits
(wishlists*)               ticket_messages          sent_emails
                           knowledgebase_*          hive_audit
                           support_macros
                           blog_*
                           campaigns*
                           segments*

* exact names may vary — grep src/infrastructure for authoritative strings
```

---

## Core commerce collections

### `products`

Sellable catalog. **`stock` is mutated only by inventory protocol** (internal `batchUpdateStock`).

| Field area | Purpose |
| --- | --- |
| `id`, `handle`, `title` | Identity + SEO URL |
| `stock`, variants | Availability (cached truth) |
| `price`, `type` | Checkout (physical/digital) |
| `metafields` | Extensibility |
| SEO fields | Storefront meta |

### `orders`

Customer transactions. Checkout creates pending → paid transition.

| Field area | Purpose |
| --- | --- |
| `status`, `paymentState` | Lifecycle |
| `metadata.checkoutOrderState` | Operator read model |
| `metadata.stripeIdentity` | PI linkage |
| `metadata.processedRefundKeys` | Refund dedup |
| `metadata.stripeRefunds` | Refund audit |
| Line items | Fulfillment |

### `carts`

Authenticated purchase intent, keyed by customer id and persisted through `CartFlowService`. Guest carts do not use this collection; they use the validated `cart:guest:v1` browser envelope.

| Field area | Purpose |
| --- | --- |
| `id`, `userId` | Session-derived owner identity |
| `items[]` | Product/variant/customization line snapshots |
| `items[].priceSnapshot` | Display and drift detection; checkout revalidates |
| `note`, `discountCode` | Cart-level intent preserved across item mutations |
| `updatedAt` | Cart freshness/expiry evaluation |

Cart writes never reserve or decrement inventory. Add/update reads availability; checkout remains responsible for authoritative revalidation and reservation. See [cart.md](./cart.md).

---

## Inventory collections

### `inventory_levels`

Per-product per-location `availableQty`. Updated by `receiveStockAtLocation` and location-aware ops.

### `inventory_ledger`

Append-only movement log. Every protocol mutation writes entries + idempotency markers.

### Reservations

Held in reservation repository collection (see `FirestoreInventoryReservationRepository`). States: `reserved` → `committed` | `released` | `expired`.

### Reconciliation cases

Opened on oversell, ledger drift, or checkout/inventory mismatch.

---

## Protocol idempotency collections

| Collection | Protocol | Key |
| --- | --- | --- |
| `stripe_webhook_events` | Checkout webhook | Stripe `event.id` |
| `checkout_recovery_attempts` | Operator recovery | `recovery:{caseId}` |
| `operator_action_events` | Checkout operator actions | `operator:{caseId}:{action}:{actorId}` |
| `refund_execution_claims` | Refunds | Client idempotency key |
| `refund_execution_events` | Refunds audit | Event uuid |
| `admin_mutation_claims` | Admin dedup | Admin mutation key |
| `admin_operator_events` | Admin audit | Event uuid |

**Design rule:** idempotency claims are separate documents so retries never double-apply monetary or stock effects.

---

## User & access

### `users`

Firebase Auth uid as document id.

| Field | Purpose |
| --- | --- |
| `role` | `admin` \| `customer` |
| `email`, profile | Identity |
| Elevation flags | Sensitive admin ops |

Admin access: [.wiki/admin-access.md](../.wiki/admin-access.md)

---

## Support & content

| Collection | Purpose |
| --- | --- |
| `support_tickets` | CRM threads |
| `ticket_messages` | Message history |
| `knowledgebase_categories` / `knowledgebase_articles` | Help center |
| `support_macros` | Agent canned replies |
| `blog_*` | Content marketing |
| Concierge sessions | AI chat state (Concierge routes) |

---

## Read vs write paths

| Collection | Public read | Mutation path |
| --- | --- | --- |
| `products` | Storefront API | Admin product protocol; stock via inventory only |
| `orders` | Owner session / admin | Checkout, admin, refund protocols |
| `inventory_ledger` | Admin read API | Inventory protocol append only |
| `users` | Self / admin | Auth routes + admin |

Client browsers **must not** write commerce collections directly — Firestore rules enforce server-side mutation.

---

## Seeding

`SeedDataLoader.ts` bootstraps dev data:

1. Products written with `stock: 0`
2. Stock applied via ledger markers (mirrors protocol semantics)
3. Admin user, sample orders, KB, tickets optional

Re-run only in dev. Production: `ALLOW_PRODUCTION_SEEDING=false`.

---

## Related

- [architecture.md § Core entities](./architecture.md#core-entities-conceptual)
- [glossary.md](./glossary.md)
- [api-overview.md](./api-overview.md)
