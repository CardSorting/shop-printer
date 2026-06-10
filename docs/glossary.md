# Glossary

Commerce and platform terms used across DreamBees Art docs. Shopify merchants will recognize many labels; protocol terms are specific to this codebase.

---

## Platform

| Term | Meaning |
| --- | --- |
| **DreamBees Art** | This open-source, self-hosted ecommerce platform (the repo/product). |
| **WoodBine** | Default demo merchant branding in the reference deployment — replace via settings. |
| **Protocol** | A frozen `ApplicationService` boundary (`checkout`, `refunds`, `inventory`, `admin`). |
| **Raw service** | Internal Core class (e.g. `RefundService`) — not callable from routes or tools. |
| **Container** | `getServerServices()` / `getInitialServices()` wiring in `src/core/container.ts`. |

---

## Storefront & catalog

| Term | Meaning |
| --- | --- |
| **Handle** | URL-safe product/collection slug (`/products/my-handle`). |
| **Variant** | SKU-level sellable unit under a product (size, edition, etc.). |
| **Metafield** | Custom attribute on product/order without schema migration. |
| **Collection** | Curated product grouping (manual or taxonomy-driven). |
| **Digital product** | Non-physical SKU — skips inventory reservation; may use vault delivery. |
| **Vault** | Customer digital locker at `/account/vault` for purchased assets. |

---

## Checkout & payments

| Term | Meaning |
| --- | --- |
| **PaymentIntent** | Stripe object representing an in-flight card payment. |
| **clientSecret** | Stripe value returned to browser for `Stripe.js` confirmation. |
| **Pending order** | Local order created before payment succeeds; status awaiting payment. |
| **Checkout lock** | Per-user mutex preventing parallel checkout sessions. |
| **Idempotency key** | Client-supplied string deduplicating retries (checkout, refunds, admin batch). |
| **Fencing token** | Checkout attempt ownership marker — stale attempts rejected. |
| **Verify path** | `GET /api/checkout/verify` — success-page finalization after Stripe redirect. |
| **Webhook path** | `POST /api/webhooks/stripe` — server-to-server finalization. |
| **Rollback** | Unpaid checkout teardown: cancel order, release stock, restore cart. |

---

## Reconciliation

| Term | Meaning |
| --- | --- |
| **Reconciliation case** | Operator record when automation cannot safely converge payment vs local state. |
| **paid_not_finalized** | Stripe succeeded; local order still pending — `retry_recovery` eligible. |
| **paid_cancelled** | Stripe succeeded after local cancel — needs human review. |
| **mapping_mismatch** | PaymentIntent metadata points at wrong order. |
| **retry_recovery** | Operator action to idempotently re-run Stripe recovery for a case. |

---

## Inventory

| Term | Meaning |
| --- | --- |
| **Catalog stock** | `product.stock` — sellable count used by cart availability. |
| **Location level** | `inventory_levels.availableQty` — warehouse/retail quantity. |
| **Reservation** | Temporary checkout hold; decrements catalog stock until commit or release. |
| **Commit** | Post-payment reservation finalization — no second stock decrement. |
| **Release** | Restore catalog stock when checkout fails or expires. |
| **Ledger** | Append-only movement log with idempotency markers. |
| **Receive marker** | Idempotency record for PO receive — prevents double inbound stock. |
| **Oversell case** | Reconciliation opened when reserve would sell below zero. |
| **continueSellingWhenOutOfStock** | Product flag bypassing availability checks (backorder-style). |

---

## Refunds

| Term | Meaning |
| --- | --- |
| **Refundable balance** | Order total minus prior refunds — max reversible amount. |
| **processedRefundKeys** | Order metadata list of completed refund idempotency keys. |
| **source** | Refund event tag: `admin`, `concierge`, or `system`. |
| **Elevation** | Admin session flag required for destructive operations (refunds). |

---

## Admin & security

| Term | Meaning |
| --- | --- |
| **Operator event** | Admin protocol audit + dedup record for a mutation. |
| **Step-up session** | Recent re-auth window for high-risk customer/admin actions. |
| **Same-origin mutation** | CSRF guard — mutating requests must match trusted origin. |
| **Audit log** | Cross-cutting operator action history in `/admin/audit`. |

---

## Support & Concierge

| Term | Meaning |
| --- | --- |
| **Concierge** | AI chat layer on storefront with tool execution (orders, refunds, tickets). |
| **Tool token** | Structured LLM output (e.g. `[PROCESS_REFUND: "orderId", 500]`) parsed by chat route. |
| **Macro** | Canned support reply for agents. |
| **Ticket** | Support CRM thread with status, priority, assignment. |

---

## Testing

| Term | Meaning |
| --- | --- |
| **Storefront release gate** | `npm run test:storefront-release` — 125 Vitest proofs across catalog, PDP, cart, checkout, inventory holds, and payment capture. |
| **Checkout smoke** | `npm run test:e2e:checkout-smoke` — 3 Playwright tests with mocked APIs and `NEXT_PUBLIC_E2E_MOCK_CHECKOUT=1`. |
| **Frozen lane** | Single construction path for a storefront concern (e.g. cart = intent buffer only; checkout = commitment gate). |
| **Verification ladder** | Vitest file proving protocol invariants (`*-verification-ladder.test.ts`). |
| **Production proof** | Behavioral test locking lane invariants (`*-production-proof.test.ts`, `*-reservation-proof.test.ts`). |
| **Seal test** | Static check that routes do not import forbidden services (`protocol-guard`, `*-protocol-guard`). |
| **Order-flow benchmark** | Core throughput test with in-memory adapters — not production SLA. |

---

## See also

- [architecture.md](./architecture.md) — how terms fit together
- [flows.md](./flows.md) — terms in context
- [commerce-protocol-frozen.md](./commerce-protocol-frozen.md) — mutation rules
