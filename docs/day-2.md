# Day 2 Guide

You completed [onboarding.md](./onboarding.md) — local store runs, test checkout works. This guide covers **what to do next** as a developer or merchant operator building on DreamBees Art.

Estimated time: **2–4 hours** for the developer track; operator tasks are independent.

---

## Developer track

### 1. Understand the codebase map (30 min)

Read in order:

1. [architecture.md](./architecture.md) — layers + protocols
2. [flows.md](./flows.md) — purchase story end-to-end
3. [glossary.md](./glossary.md) — terms you'll see in code

Open these files side-by-side:

```text
src/core/container.ts          # what exists on services.*
src/infrastructure/server/services.ts
src/app/api/checkout/create-payment-intent/route.ts   # thin route example
src/core/order/CheckoutFlowService.ts                 # protocol implementation
```

### 2. Run targeted tests (15 min)

```bash
# Protocol seals only (~seconds)
npm test -- --run src/tests/checkout-verification-ladder.test.ts

# Checkout integration depth
npm test -- --run \
  src/tests/checkout-flow-service.test.ts \
  src/tests/checkout-webhook-ingress.test.ts

# Full commerce core
npm test -- --run src/tests/financial-recovery-hardening.test.ts
```

When a test fails, the test name usually states the invariant — fix protocol code, not route shortcuts.

### 3. Make a safe first change (45 min)

**Good first PRs** (protocol-safe):

| Change | Where |
| --- | --- |
| Storefront copy / layout | `src/ui/pages/` |
| Admin dashboard label | `src/ui/navigation/adminNavigation.ts` |
| SEO default | `src/domain/seo/brand.ts` |
| New read-only API field | Route + query service (no stock/money mutation) |

**Avoid until you know the protocols:**

| Change | Why |
| --- | --- |
| New Stripe call in route | Bypasses checkout protocol |
| Product PATCH with `stock` | Rejected — use inventory batch |
| Direct `refundService` | Breaks refund seal |

Guide: [contributing-commerce.md](./contributing-commerce.md)

### 4. Trace one real request (30 min)

With dev server running, complete a checkout and follow the chain:

```text
Browser Network tab
  POST /api/checkout/create-payment-intent
    → src/app/api/checkout/create-payment-intent/route.ts
    → services.checkout.createCheckoutSession
    → CheckoutFlowService → checkoutClientStartFlow
    → inventory.reserveInventory
```

Set breakpoints or add temporary structured logs — remove before commit.

### 5. Configure optional integrations (30 min)

| Integration | Env vars | Doc |
| --- | --- | --- |
| Email | `BREVO_*` | [getting-started.md](./getting-started.md) |
| Concierge AI | `GEMINI_API_KEY` | [concierge/overview.md](./concierge/overview.md) |
| Trusted checkout | `CHECKOUT_ENDPOINT` | [checkout.md § Construction](./checkout.md#2-construction) |

---

## Merchant operator track

These tasks assume admin login ([onboarding credentials](./onboarding.md#default-dev-credentials)).

### Rebrand the store (20 min)

1. `/admin/settings` — store name, contact, policies
2. `/admin/seo` — homepage title/description preview
3. Replace logos in `public/images/`
4. Update `src/domain/seo/brand.ts` for code-level constants
5. `.env` — `NEXT_PUBLIC_SITE_URL`, business address fields

### Add your first real product (15 min)

1. `/admin/products/new`
2. Set title, handle, price, type (physical/digital)
3. Upload media via admin files
4. Assign collection or taxonomy
5. Verify on `/products/[handle]`

**Do not** set stock on the product form if it exposes raw stock — use `/admin/inventory` batch adjust after create.

### Configure shipping (30 min)

1. `/admin/settings` → shipping sections
2. Create zones, classes, rates
3. Test quote at checkout with a cart

API reference: [api-overview.md § Admin shipping](./api-overview.md)

### Process a test order end-to-end (20 min)

```text
Storefront purchase
  → /admin/orders/[id] review
  → fulfill + add tracking
  → customer /orders/[id] confirms timeline
```

Optional: partial refund with reason (elevated session).

Walkthrough: [flows.md](./flows.md)

### Receive inbound stock (30 min)

If using purchase orders:

```text
/admin/purchase-orders/new
  → submit PO
  → /admin/purchase-orders/[id]/receive
  → verify /admin/inventory + ledger
```

Story: [flows.md § Receive stock](./flows.md#receive-stock-flow-purchase-order)

---

## Production prep checklist

Before first deploy:

- [ ] Replace all demo credentials and WoodBine branding
- [ ] Production Firebase project + rules deployed
- [ ] Production Stripe keys + **live** webhook endpoint registered
- [ ] `ALLOW_PRODUCTION_SEEDING=false`
- [ ] `SESSION_SECRET` rotated (32+ chars, unique)
- [ ] `npm run build` + `npm test` pass in CI
- [ ] Run cleanup jobs on a schedule (`/api/system/cleanup-orders`, `/api/system/cleanup-inventory`) with bearer auth
- [ ] Monitor reconciliation cases in admin

Deploy: [deployment.md](./deployment.md) · Ops: [runbook.md](./runbook.md) · Security: [security.md](./security.md)

---

## Week 1 learning goals

| By end of week | You'll know |
| --- | --- |
| Day 2 | Where routes end and protocols begin |
| Day 3 | How checkout + inventory cooperate on purchase |
| Day 4 | How admin authorization wraps refunds and batch ops |
| Day 5 | How to run verification ladders before any commerce PR |

---

## Next documents

| Goal | Doc |
| --- | --- |
| Extend commerce safely | [contributing-commerce.md](./contributing-commerce.md) |
| Debug issues | [troubleshooting.md](./troubleshooting.md) · [faq.md](./faq.md) |
| Deploy + operate | [deployment.md](./deployment.md) · [runbook.md](./runbook.md) |
| Test suites | [testing.md](./testing.md) |
| Cheat sheet | [quick-reference.md](./quick-reference.md) |
| Firestore map | [data-model.md](./data-model.md) |
| API surface | [api-overview.md](./api-overview.md) |
| Terms | [glossary.md](./glossary.md) |
