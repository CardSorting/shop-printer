# FAQ

Common questions about DreamBees Art as an open-source Shopify-class platform.

---

## General

### What is DreamBees Art?

A self-hosted ecommerce monolith: Next.js storefront + admin + Firestore + Stripe. Full source access; you own data and infrastructure.

### How is this different from Shopify?

Shopify is hosted SaaS with themes and apps. DreamBees Art is **deployable source** with explicit checkout/inventory/refund protocols you can read and patch.

### What is WoodBine?

Default **demo merchant branding** in this repo. Replace via admin settings and `src/domain/seo/brand.ts`.

### Can I run multi-tenant SaaS on this?

Not out of the box. One deployment = one merchant Firestore project. Multi-tenant would be a major fork.

---

## Setup

### Why is my order stuck pending after payment?

Almost always **webhooks**. Local: run `stripe listen`. Production: register live webhook URL and set `STRIPE_WEBHOOK_SECRET`. See [troubleshooting.md § Webhooks](./troubleshooting.md#webhooks--finalization).

### What does `npm run setup` do?

Installs deps, creates `.env`, seeds Firestore with sample catalog + admin user. See [onboarding.md](./onboarding.md).

### Default admin login?

`admin@woodbine.com` / `admin-password-123` — **local dev only**.

---

## Architecture

### Why four protocols?

To cage money and stock mutations: checkout, refunds, inventory, admin. Routes stay thin; behavior is testable. [commerce-protocol-frozen.md](./commerce-protocol-frozen.md)

### Can I call Stripe from a route?

No — use `services.checkout` or `services.refunds` through the appropriate protocol.

### Can I set stock on product edit?

No — product PATCH rejects raw `stock`. Use admin inventory batch adjust. [inventory.md](./inventory.md)

### Where do I add a feature?

Decision tree: [contributing-commerce.md](./contributing-commerce.md)

---

## Operations

### Do I need scheduled jobs?

Yes for production. Call `POST /api/system/cleanup-orders` with `SYSTEM_JOB_TOKEN` on a schedule. [runbook.md](./runbook.md)

### How do I fix paid-not-finalized orders?

Admin reconciliation → `retry_recovery` with reason. [flows.md § Reconciliation](./flows.md#reconciliation-flow-payment-mismatch)

### Will retrying a refund double-charge the customer?

No — same `idempotencyKey` returns `{ duplicate: true }` without a second Stripe refund.

---

## Development

### Which tests must pass before a commerce PR?

Storefront or checkout UI changes:

```bash
npm run test:storefront-release
npm run test:e2e:cart-smoke       # cart, storage, merge, and handoff changes
npm run test:e2e:checkout-smoke   # checkout UI changes
```

All protocol changes also need verification ladders:

```bash
npm test -- --run src/tests/*-verification-ladder.test.ts
```

[testing.md](./testing.md) · [storefront-release.md](./storefront-release.md)

### What's the benchmark?

`npm run benchmark:order-flow` — Core throughput with in-memory adapters, not production SLA.

---

## Integrations

### Is Concierge required?

No. Set `GEMINI_API_KEY` to enable; commerce works without it.

### Email?

Optional Brevo (`BREVO_*`). Password reset and notifications depend on configuration.

### Can I migrate from Shopify?

Conceptual guide — no automated importer. [migration-from-shopify.md](./migration-from-shopify.md)

### Where is the full env var list?

[environment-variables.md](./environment-variables.md)

### How do I rebrand?

[customization.md](./customization.md)

### What's the release checklist?

[release-checklist.md](./release-checklist.md)

---

| Topic | Doc |
| --- | --- |
| Setup | [onboarding.md](./onboarding.md) |
| Cheat sheet | [quick-reference.md](./quick-reference.md) |
| Debug | [troubleshooting.md](./troubleshooting.md) |
| Deploy | [deployment.md](./deployment.md) |
| Terms | [glossary.md](./glossary.md) |
| Full index | [index.md](./index.md) |
